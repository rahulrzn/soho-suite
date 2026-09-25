# Databricks notebook source
# DBTITLE 1,Silver Transformation
# MAGIC %md
# MAGIC # Silver Transformation
# MAGIC
# MAGIC Apply null handling, quality flags, derived columns, and write cleaned data to Delta tables in `olist_data.silver`.

# COMMAND ----------

# DBTITLE 1,Read from Bronze Delta Tables
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StringType, IntegerType, DoubleType, TimestampType
)

bronze_schema = "olist_data.bronze"

# Read from Bronze Delta tables (medallion: downstream layers read from Bronze)
customer = spark.table(f"{bronze_schema}.customers")
geolocation = spark.table(f"{bronze_schema}.geolocation")
order_items = spark.table(f"{bronze_schema}.order_items")
order_payments = spark.table(f"{bronze_schema}.order_payments")
order_reviews = spark.table(f"{bronze_schema}.order_reviews")
orders = spark.table(f"{bronze_schema}.orders")
products = spark.table(f"{bronze_schema}.products")
product_category = spark.table(f"{bronze_schema}.product_category")
sellers = spark.table(f"{bronze_schema}.sellers")

print("Loaded all tables from olist_data.bronze.*")
for name, df in [("customers", customer), ("geolocation", geolocation), ("order_items", order_items),
                 ("order_payments", order_payments), ("order_reviews", order_reviews), ("orders", orders),
                 ("products", products), ("product_category", product_category), ("sellers", sellers)]:
    print(f"  {name}: {df.count()} rows")

# COMMAND ----------

# DBTITLE 1,Schema Enforcement & Type Casting
# MAGIC %md
# MAGIC ## **Schema Enforcement & Type Casting**
# MAGIC
# MAGIC Per medallion silver layer rules: enforce schema with explicit type casting.
# MAGIC Bronze uses `inferSchema` — Silver explicitly casts each column to its canonical type.

# COMMAND ----------

# DBTITLE 1,Type Casting
# Explicit type casting for schema enforcement
# Per silver layer rules: Type casting, Schema enforcement

# customers
customer = customer.select(
    F.col("customer_id").cast(StringType()),
    F.col("customer_unique_id").cast(StringType()),
    F.col("customer_zip_code_prefix").cast(IntegerType()),
    F.col("customer_city").cast(StringType()),
    F.col("customer_state").cast(StringType()),
)

# geolocation
geolocation = geolocation.select(
    F.col("geolocation_zip_code_prefix").cast(IntegerType()),
    F.col("geolocation_lat").cast(DoubleType()),
    F.col("geolocation_lng").cast(DoubleType()),
    F.col("geolocation_city").cast(StringType()),
    F.col("geolocation_state").cast(StringType()),
)

# order_items
order_items = order_items.select(
    F.col("order_id").cast(StringType()),
    F.col("order_item_id").cast(IntegerType()),
    F.col("product_id").cast(StringType()),
    F.col("seller_id").cast(StringType()),
    F.col("shipping_limit_date").cast(TimestampType()),
    F.col("price").cast(DoubleType()),
    F.col("freight_value").cast(DoubleType()),
)

# order_payments
order_payments = order_payments.select(
    F.col("order_id").cast(StringType()),
    F.col("payment_sequential").cast(IntegerType()),
    F.col("payment_type").cast(StringType()),
    F.col("payment_installments").cast(IntegerType()),
    F.col("payment_value").cast(DoubleType()),
)

# order_reviews
order_reviews = order_reviews.select(
    F.col("review_id").cast(StringType()),
    F.col("order_id").cast(StringType()),
    F.col("review_score").cast(IntegerType()),
    F.col("review_comment_title").cast(StringType()),
    F.col("review_comment_message").cast(StringType()),
    F.col("review_creation_date").cast(TimestampType()),
    F.col("review_answer_timestamp").cast(TimestampType()),
)

# orders
orders = orders.select(
    F.col("order_id").cast(StringType()),
    F.col("customer_id").cast(StringType()),
    F.col("order_status").cast(StringType()),
    F.col("order_purchase_timestamp").cast(TimestampType()),
    F.col("order_approved_at").cast(TimestampType()),
    F.col("order_delivered_carrier_date").cast(TimestampType()),
    F.col("order_delivered_customer_date").cast(TimestampType()),
    F.col("order_estimated_delivery_date").cast(TimestampType()),
)

# products
products = products.select(
    F.col("product_id").cast(StringType()),
    F.col("product_category_name").cast(StringType()),
    F.col("product_name_lenght").cast(IntegerType()),
    F.col("product_description_lenght").cast(IntegerType()),
    F.col("product_photos_qty").cast(IntegerType()),
    F.col("product_weight_g").cast(IntegerType()),
    F.col("product_length_cm").cast(IntegerType()),
    F.col("product_height_cm").cast(IntegerType()),
    F.col("product_width_cm").cast(IntegerType()),
)

# product_category
product_category = product_category.select(
    F.col("product_category_name").cast(StringType()),
    F.col("product_category_name_english").cast(StringType()),
)

# sellers
sellers = sellers.select(
    F.col("seller_id").cast(StringType()),
    F.col("seller_zip_code_prefix").cast(IntegerType()),
    F.col("seller_city").cast(StringType()),
    F.col("seller_state").cast(StringType()),
)

print("Schema enforcement complete — all columns explicitly cast.")

# COMMAND ----------

# DBTITLE 1,Data Deduplication
# MAGIC %md
# MAGIC ## **Data Deduplication**
# MAGIC
# MAGIC Per silver layer rules: remove exact duplicate rows from each table.
# MAGIC Uses `distinct()` — if duplicate rows exist, only the first occurrence is kept.

# COMMAND ----------

# DBTITLE 1,Deduplicate Tables
# Remove duplicates from each DataFrame
customer = customer.distinct()
geolocation = geolocation.distinct()
order_items = order_items.distinct()
order_payments = order_payments.distinct()
order_reviews = order_reviews.distinct()
orders = orders.distinct()
products = products.distinct()
product_category = product_category.distinct()
sellers = sellers.distinct()
print("Deduplication complete — all tables contain only unique rows.")

# COMMAND ----------

# DBTITLE 1,Create Silver Schema
# MAGIC %md
# MAGIC
# MAGIC ## **Create Silver Schema**

# COMMAND ----------

# DBTITLE 1,Create Silver Schema
silver_schema = "olist_data.silver"
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {silver_schema}")
print(f"Schema '{silver_schema}' ready.")

# COMMAND ----------

# DBTITLE 1,Handling Products Missing Values
# MAGIC %md
# MAGIC ## **Handling Products Missing Values**

# COMMAND ----------

# DBTITLE 1,Add Product Category Missing Flag
# Per data quality preferences: keep NULLs, use missing-flags instead of imputation
products = products.withColumn(
    "product_category_name_missing_flag",
    F.when(F.col("product_category_name").isNull(), 1).otherwise(0)
)

# COMMAND ----------

# DBTITLE 1,Handling Orders Missing Values
# MAGIC %md
# MAGIC ## **Handling Orders Missing Values**

# COMMAND ----------

# DBTITLE 1,Add Delivery Date Missing Flag
orders = orders.withColumn(
    "delivery_date_missing_flag",
    F.when(
        (F.col("order_status") == "delivered") &
        (F.col("order_delivered_customer_date").isNull()),
        1
    ).otherwise(0)
)

# COMMAND ----------

# DBTITLE 1,Handling Remaining Missing Values
# MAGIC %md
# MAGIC ## **Handling Remaining Missing Values**

# COMMAND ----------

# DBTITLE 1,Add Order Date Missing Flags
# Orders: keep remaining date nulls as-is (previous coalesce with None was a no-op)
orders = orders.withColumn(
    "approved_date_missing_flag", F.when(F.col("order_approved_at").isNull(), 1).otherwise(0)
).withColumn(
    "carrier_date_missing_flag", F.when(F.col("order_delivered_carrier_date").isNull(), 1).otherwise(0)
)


# COMMAND ----------

# DBTITLE 1,Order Derived Columns
# MAGIC %md
# MAGIC ## **Order Derived Columns**
# MAGIC
# MAGIC Add analytical columns to `orders` for downstream reporting:
# MAGIC
# MAGIC | Column | Source | Purpose |
# MAGIC | --- | --- | --- |
# MAGIC | `purchase_year_month` | `order_purchase_timestamp` | Monthly analysis |
# MAGIC | `delivery_days` | `order_delivered_customer_date` − `order_purchase_timestamp` | Average delivery time |
# MAGIC | `delivery_delay_days` | `order_delivered_customer_date` − `order_estimated_delivery_date` | How many days late/early |
# MAGIC | `is_late_delivery` | `delivery_delay_days > 0` | 1=late, 0=on time, NULL=date unavailable |

# COMMAND ----------

# DBTITLE 1,Add Order Derived Columns
# purchase_year_month — for monthly trend analysis
orders = orders.withColumn(
    "purchase_year_month",
    F.date_format(F.col("order_purchase_timestamp"), "yyyy-MM")
)

# delivery_days — actual delivery time in days (purchase → customer delivery)
orders = orders.withColumn(
    "delivery_days",
    F.datediff(F.col("order_delivered_customer_date"), F.col("order_purchase_timestamp"))
)

# delivery_delay_days — positive = late, negative = early, 0 = on time
orders = orders.withColumn(
    "delivery_delay_days",
    F.datediff(F.col("order_delivered_customer_date"), F.col("order_estimated_delivery_date"))
)

# is_late_delivery — 1 if delivered late, 0 if on time/early, NULL if delivery date unavailable
orders = orders.withColumn(
    "is_late_delivery",
    F.when(F.col("delivery_delay_days").isNull(), None)
    .when(F.col("delivery_delay_days") > 0, 1)
    .otherwise(0)
)

display(
    orders
    .select(
        "order_id",
        "purchase_year_month",
        "delivery_days",
        "delivery_delay_days",
        "is_late_delivery",
    )
    .limit(10)
)

# COMMAND ----------

# DBTITLE 1,Review Sentiment Classification
# MAGIC %md
# MAGIC ## **Review Sentiment Classification**

# COMMAND ----------

# DBTITLE 1,Add Review Sentiment Column
# Classify review_score into sentiment categories
# 1-2 = negative, 3 = neutral, 4-5 = positive
order_reviews = order_reviews.withColumn(
    "review_sentiment",
    F.when(F.col("review_score").isin([1, 2]), "negative")
    .when(F.col("review_score") == 3, "neutral")
    .when(F.col("review_score").isin([4, 5]), "positive")
    .otherwise("unknown")
)

display(
    order_reviews
    .groupBy("review_sentiment")
    .count()
    .orderBy(F.desc("count"))
)

# COMMAND ----------

# DBTITLE 1,Enrichment Joins
# MAGIC %md
# MAGIC ## **Enrichment Joins**
# MAGIC
# MAGIC Per medallion silver layer rules: enrich data via joins to add business context.
# MAGIC - Products → product category English translation
# MAGIC - Customers → geolocation (average lat/lng per zip code prefix)

# COMMAND ----------

# DBTITLE 1,Enrich Products with Category Translation
# Enrichment 1: Products + product_category translation
# Join to add English category name; use LEFT join so products without translation are kept (NULL english name)
products = products.join(
    product_category,
    on="product_category_name",
    how="left"
)

print(f"Products enriched with English category name: {products.count()} rows")
print(f"  Products with English translation: {products.filter(F.col('product_category_name_english').isNotNull()).count()}")
print(f"  Products without English translation: {products.filter(F.col('product_category_name_english').isNull()).count()}")

# COMMAND ----------

# DBTITLE 1,Enrich Customers with Geolocation
# Enrichment 2: Customers + geolocation (aggregated)
# Geolocation has multiple entries per zip code prefix — aggregate to one row per prefix
geo_agg = geolocation.groupBy("geolocation_zip_code_prefix").agg(
    F.avg("geolocation_lat").alias("geolocation_lat"),
    F.avg("geolocation_lng").alias("geolocation_lng"),
    F.first("geolocation_city").alias("geolocation_city"),
    F.first("geolocation_state").alias("geolocation_state"),
)

# LEFT join so customers without geolocation match are kept (NULL geo fields)
before_count = customer.count()
customer = customer.join(
    geo_agg,
    customer.customer_zip_code_prefix == geo_agg.geolocation_zip_code_prefix,
    how="left"
).drop("geolocation_zip_code_prefix")

matched = customer.filter(F.col("geolocation_lat").isNotNull()).count()
print(f"Customers enriched with geolocation: {customer.count()} rows (was {before_count})")
print(f"  Matched geolocation: {matched}")
print(f"  No geolocation match: {before_count - matched}")

# COMMAND ----------

# DBTITLE 1,Write Cleaned Data to Delta Tables
# MAGIC %md
# MAGIC ## **Write Cleaned Data to Delta Tables**

# COMMAND ----------

# DBTITLE 1,Write to Delta Tables
# Write all cleaned DataFrames to Delta tables in olist_data.silver schema
tables = [
    ("customers", customer),
    ("geolocation", geolocation),
    ("order_items", order_items),
    ("order_payments", order_payments),
    ("order_reviews", order_reviews),
    ("orders", orders),
    ("products", products),
    ("product_category", product_category),
    ("sellers", sellers),
]

for table_name, df in tables:
    full_name = f"{silver_schema}.{table_name}"
    print(f"Writing {full_name}...")
    (
        df.write
        .format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .saveAsTable(full_name)
    )
    print(f"  {df.count()} rows written")

print("All tables written successfully.")

# COMMAND ----------

# DBTITLE 1,Post-Silver Validation
# MAGIC %md
# MAGIC
# MAGIC ## **Post-Silver Validation**
# MAGIC
# MAGIC Verify transformations persisted correctly by reading from `olist_data.silver` Delta tables.

# COMMAND ----------

# DBTITLE 1,Verify Products Nulls (from Silver)
# Products: keep all nulls as NULL — filling with 0 would change meaning for dimensions/weight
# product_category_name_missing_flag added instead of imputing with "unknown"

print("Products remaining nulls (numeric fields kept as NULL):")
products_silver = spark.table(f"{silver_schema}.products")
products_silver.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in products_silver.columns]).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Verify Review Nulls (from Silver)
# Order reviews: keep null comment fields as NULL — empty strings would conflate "no comment" with "blank comment"
# Only review_sentiment was added (handled in earlier cell)

print("Order reviews remaining nulls (comment fields kept as NULL):")
reviews_silver = spark.table(f"{silver_schema}.order_reviews")
reviews_silver.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in reviews_silver.columns]).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Verify Orders Nulls (from Silver)
print("Orders remaining nulls (dates kept as NULL, flags added):")
orders_silver = spark.table(f"{silver_schema}.orders")
orders_silver.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in orders_silver.columns]).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Silver Duplicate Checks
# MAGIC %md
# MAGIC
# MAGIC ## **Silver Validation: Duplicate Checks**
# MAGIC
# MAGIC Verify no duplicate primary keys exist in silver tables.

# COMMAND ----------

# DBTITLE 1,Run Duplicate Key Checks
# Duplicate checks on key columns in silver tables
dup_checks = [
    ("customers", "customer_id"),
    ("orders", "order_id"),
    ("products", "product_id"),
    ("sellers", "seller_id"),
    ("order_payments", ["order_id", "payment_sequential"]),
    ("order_items", ["order_id", "order_item_id"]),
    ("order_reviews", ["review_id", "order_id"]),
    ("product_category", "product_category_name"),
]

print("=== Silver Duplicate Key Checks ===")
all_clean = True
for table, key in dup_checks:
    df = spark.table(f"{silver_schema}.{table}")
    if isinstance(key, list):
        dup_count = df.groupBy(*key).count().filter("count > 1").count()
        key_str = "+".join(key)
    else:
        dup_count = df.groupBy(key).count().filter("count > 1").count()
        key_str = key
    status = "PASS" if dup_count == 0 else f"FAIL ({dup_count} duplicate keys)"
    if dup_count > 0:
        all_clean = False
    print(f"  {table} ({key_str}): {status}")

print(f"\nOverall: {'ALL PASS' if all_clean else 'FAILURES FOUND'}")

# COMMAND ----------

# DBTITLE 1,Silver Referential Integrity
# MAGIC %md
# MAGIC
# MAGIC ## **Silver Validation: Referential Integrity**
# MAGIC
# MAGIC Verify foreign key relationships hold across silver tables.

# COMMAND ----------

# DBTITLE 1,Run Referential Integrity Checks
# Referential integrity checks across silver tables
ri_checks = [
    ("order_items", "order_id", "orders", "order_id", "order_items→orders"),
    ("order_items", "product_id", "products", "product_id", "order_items→products"),
    ("order_items", "seller_id", "sellers", "seller_id", "order_items→sellers"),
    ("orders", "customer_id", "customers", "customer_id", "orders→customers"),
    ("order_payments", "order_id", "orders", "order_id", "order_payments→orders"),
    ("order_reviews", "order_id", "orders", "order_id", "order_reviews→orders"),
]

print("=== Silver Referential Integrity Checks ===")
all_clean = True
for child_table, child_key, parent_table, parent_key, label in ri_checks:
    child_df = spark.table(f"{silver_schema}.{child_table}").select(child_key).distinct()
    parent_df = spark.table(f"{silver_schema}.{parent_table}").select(parent_key).distinct()
    
    # Find child keys that don't exist in parent (orphaned records)
    orphans = child_df.join(parent_df, child_df[child_key] == parent_df[parent_key], "left_anti")
    orphan_count = orphans.count()
    
    status = "PASS" if orphan_count == 0 else f"FAIL ({orphan_count} orphaned records)"
    if orphan_count > 0:
        all_clean = False
    print(f"  {label}: {status}")

print(f"\nOverall: {'ALL PASS' if all_clean else 'FAILURES FOUND'}")

# COMMAND ----------

# DBTITLE 1,Silver Row Count Summary
# Silver row counts summary
print("=== Silver Table Row Counts ===")
silver_tables = ["customers", "geolocation", "order_items", "order_payments",
                 "order_reviews", "orders", "products", "product_category", "sellers"]
for t in silver_tables:
    count = spark.table(f"{silver_schema}.{t}").count()
    print(f"  {t}: {count:,} rows")
print("\nSilver layer validation complete.")