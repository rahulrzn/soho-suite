# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# DBTITLE 1,Title
# MAGIC %md
# MAGIC # Data Modeling: Star Schema for Gold Layer
# MAGIC
# MAGIC This notebook builds a star schema from the silver layer tables. Dimension tables (dim_customer, dim_product, dim_product_category, dim_seller, dim_date) and fact tables (fact_order_items, fact_order_payments, fact_order_reviews, fact_order_aggregate) are created in separate cells, followed by data validation and writes to the `olist_data.gold` schema.

# COMMAND ----------

# DBTITLE 1,Load silver tables
from pyspark.sql import functions as F

customers = spark.table("olist_data.silver.customers")
orders = spark.table("olist_data.silver.orders")
order_items = spark.table("olist_data.silver.order_items")
payments = spark.table("olist_data.silver.order_payments")
reviews = spark.table("olist_data.silver.order_reviews")
products = spark.table("olist_data.silver.products")
sellers = spark.table("olist_data.silver.sellers")
product_category = spark.table("olist_data.silver.product_category")

# COMMAND ----------

# DBTITLE 1,Create gold schema
spark.sql("CREATE SCHEMA IF NOT EXISTS olist_data.gold")
print("Gold schema ready: olist_data.gold")

# COMMAND ----------

# DBTITLE 1,dim_customer
# dim_customer — one row per customer_id (PK)
# Type 1 SCD: overwrite with latest attributes

dim_customer = customers.select(
    "customer_id",
    "customer_unique_id",
    F.col("customer_zip_code_prefix").alias("zip_code_prefix"),
    F.col("customer_city").alias("city"),
    F.col("customer_state").alias("state"),
    # Geolocation enrichment columns (from silver layer)
    F.col("geolocation_lat").alias("latitude"),
    F.col("geolocation_lng").alias("longitude"),
    F.col("geolocation_city").alias("geo_city"),
    F.col("geolocation_state").alias("geo_state"),
)

# Verify PK uniqueness
cust_dupes = dim_customer.groupBy("customer_id").count().filter("count > 1")
print(f"dim_customer row count: {dim_customer.count()}")
print(f"dim_customer duplicate customer_ids: {cust_dupes.count()}")
display(dim_customer.limit(5))

# COMMAND ----------

# DBTITLE 1,dim_product
# dim_product — one row per product_id (PK)

dim_product = products.select(
    "product_id",
    "product_category_name",
    F.col("product_category_name_english").alias("product_category_name_english"),
    F.col("product_category_name_missing_flag").alias("category_name_missing_flag"),
    F.col("product_name_lenght").alias("product_name_length"),
    F.col("product_description_lenght").alias("product_description_length"),
    F.col("product_photos_qty").alias("product_photos_qty"),
    F.col("product_weight_g").alias("weight_g"),
    F.col("product_length_cm").alias("length_cm"),
    F.col("product_height_cm").alias("height_cm"),
    F.col("product_width_cm").alias("width_cm"),
)

# Verify PK uniqueness
prod_dupes = dim_product.groupBy("product_id").count().filter("count > 1")
print(f"dim_product row count: {dim_product.count()}")
print(f"dim_product duplicate product_ids: {prod_dupes.count()}")
display(dim_product.limit(5))

# COMMAND ----------

# DBTITLE 1,dim_seller
# dim_seller — one row per seller_id (PK)

dim_seller = sellers.select(
    "seller_id",
    F.col("seller_zip_code_prefix").alias("zip_code_prefix"),
    F.col("seller_city").alias("city"),
    F.col("seller_state").alias("state"),
)

# Verify PK uniqueness
seller_dupes = dim_seller.groupBy("seller_id").count().filter("count > 1")
print(f"dim_seller row count: {dim_seller.count()}")
print(f"dim_seller duplicate seller_ids: {seller_dupes.count()}")
display(dim_seller.limit(5))

# COMMAND ----------

# DBTITLE 1,dim_product_category
# dim_product_category — one row per product_category_name (PK)
# Category name translation lookup (Portuguese → English)

dim_product_category = product_category.select(
    "product_category_name",
    "product_category_name_english",
)

# Verify PK uniqueness
cat_dupes = dim_product_category.groupBy("product_category_name").count().filter("count > 1")
print(f"dim_product_category row count: {dim_product_category.count()}")
print(f"dim_product_category duplicate keys: {cat_dupes.count()}")
display(dim_product_category.limit(5))

# COMMAND ----------

# DBTITLE 1,dim_date
# dim_date — derived from all date columns in the orders table
# Collect every distinct date that appears across the order lifecycle

date_cols = [
    F.col("order_purchase_timestamp").alias("d"),
    F.col("order_approved_at").alias("d"),
    F.col("order_delivered_carrier_date").alias("d"),
    F.col("order_delivered_customer_date").alias("d"),
    F.col("order_estimated_delivery_date").alias("d"),
]

all_dates = orders.select(date_cols[0])
for c in date_cols[1:]:
    all_dates = all_dates.union(orders.select(c))

dim_date = (
    all_dates
    .filter(F.col("d").isNotNull())
    .distinct()
    .select(
        F.col("d").cast("date").alias("date"),
        F.year("d").alias("year"),
        F.month("d").alias("month"),
        F.date_format("d", "MMMM").alias("month_name"),
        F.dayofmonth("d").alias("day"),
        F.dayofweek("d").alias("day_of_week"),
        F.date_format("d", "EEEE").alias("day_name"),
        F.weekofyear("d").alias("week_of_year"),
        F.quarter("d").alias("quarter"),
        F.when(F.dayofweek("d").isin(1, 7), 1).otherwise(0).alias("is_weekend"),
    )
    .distinct()
    .orderBy("date")
)

# Add a surrogate date_key as integer YYYYMMDD for FK joins
dim_date = dim_date.withColumn(
    "date_key",
    (F.year("date") * 10000 + F.month("date") * 100 + F.dayofmonth("date"))
)

# Reorder so date_key is first
dim_date = dim_date.select("date_key", "date", "year", "month", "month_name", "day", "day_of_week", "day_name", "week_of_year", "quarter", "is_weekend")

print(f"dim_date row count: {dim_date.count()}")
display(dim_date.limit(5))

# COMMAND ----------

# DBTITLE 1,fact_order_items
# fact_order_items — grain: one row per (order_id, order_item_id)
# The most granular fact table; links to dim_customer, dim_product, dim_seller, dim_date

fact_order_items = (
    order_items
    .join(orders, on="order_id", how="left")
    .select(
        order_items.order_id,
        order_items.order_item_id,
        orders.customer_id,                         # FK → dim_customer
        order_items.product_id,                      # FK → dim_product
        order_items.seller_id,                       # FK → dim_seller
        F.col("order_purchase_timestamp").cast("date").alias("purchase_date"),
        (F.year("order_purchase_timestamp") * 10000 + F.month("order_purchase_timestamp") * 100 + F.dayofmonth("order_purchase_timestamp")).alias("purchase_date_key"),  # FK → dim_date
        F.col("shipping_limit_date").alias("shipping_limit_date"),
        F.col("order_status"),
        F.col("price"),
        F.col("freight_value"),
        (F.col("price") + F.col("freight_value")).alias("total_item_value"),
        F.col("delivery_days"),
        F.col("delivery_delay_days"),
        F.col("is_late_delivery"),
        F.col("delivery_date_missing_flag"),
        F.col("approved_date_missing_flag"),
        F.col("carrier_date_missing_flag"),
    )
)

print(f"fact_order_items row count: {fact_order_items.count()}")

# Check for duplicate rows at the grain level (order_id, order_item_id)
item_dupes = fact_order_items.groupBy("order_id", "order_item_id").count().filter("count > 1")
print(f"Duplicate (order_id, order_item_id) rows: {item_dupes.count()}")
display(fact_order_items.limit(5))

# COMMAND ----------

# DBTITLE 1,fact_order_payments
# fact_order_payments — grain: one row per (order_id, payment_sequential)

fact_order_payments = payments.select(
    "order_id",
    "payment_sequential",
    "payment_type",
    "payment_installments",
    "payment_value",
)

print(f"fact_order_payments row count: {fact_order_payments.count()}")

# Check for duplicate rows at the grain level
pay_dupes = fact_order_payments.groupBy("order_id", "payment_sequential").count().filter("count > 1")
print(f"Duplicate (order_id, payment_sequential) rows: {pay_dupes.count()}")
display(fact_order_payments.limit(5))

# COMMAND ----------

# DBTITLE 1,fact_order_reviews
# fact_order_reviews — grain: one row per (review_id, order_id)
# Review scores and sentiment as a fact table; links to orders via order_id

fact_order_reviews = reviews.select(
    "review_id",
    "order_id",
    "review_score",
    "review_sentiment",
    F.col("review_comment_title").alias("comment_title"),
    F.col("review_comment_message").alias("comment_message"),
    F.col("review_creation_date").alias("review_creation_date"),
    F.col("review_answer_timestamp").alias("review_answer_timestamp"),
)

print(f"fact_order_reviews row count: {fact_order_reviews.count()}")

# Check for duplicate rows at the grain level (review_id, order_id)
review_dupes = fact_order_reviews.groupBy("review_id", "order_id").count().filter("count > 1")
print(f"Duplicate (review_id, order_id) rows: {review_dupes.count()}")
display(fact_order_reviews.limit(5))

# COMMAND ----------

# DBTITLE 1,Order-level aggregate + duplicate check
# Order-level aggregate — one row per order_id
# Starts from the orders table to preserve ALL orders, even those without
# matching item/payment/review records (LEFT JOINs below).

from pyspark.sql.window import Window

# Base: one row per order from the orders table (preserves all orders)
order_base = orders.select(
    "order_id",
    "customer_id",
    "order_status",
    F.col("order_purchase_timestamp").cast("date").alias("purchase_date"),
    (F.year("order_purchase_timestamp") * 10000 + F.month("order_purchase_timestamp") * 100 + F.dayofmonth("order_purchase_timestamp")).alias("purchase_date_key"),
    F.col("is_late_delivery").alias("has_late_delivery"),
    F.col("delivery_days").alias("max_delivery_days"),
    F.col("delivery_delay_days").alias("max_delivery_delay_days"),
)

# Aggregate from fact_order_items (LEFT JOIN — some orders have no items)
order_item_agg = (
    fact_order_items
    .groupBy("order_id")
    .agg(
        F.count("order_item_id").alias("item_count"),
        F.sum("price").alias("total_price"),
        F.sum("freight_value").alias("total_freight"),
        F.sum("total_item_value").alias("total_order_value"),
    )
)

# Aggregate from fact_order_payments (LEFT JOIN — some orders have no payments)
order_payment_agg = (
    fact_order_payments
    .groupBy("order_id")
    .agg(
        F.count("payment_sequential").alias("payment_count"),
        F.sum("payment_value").alias("total_payment_value"),
        F.max("payment_installments").alias("max_installments"),
        F.collect_set("payment_type").alias("payment_types"),
    )
)

# Aggregate from reviews (LEFT JOIN — some orders have no reviews)
# Use the most recent review per order (by review_answer_timestamp) as the
# representative sentiment. A customer's latest feedback is the most current signal.
# max(review_sentiment) was removed: alphabetical max always picks "positive"
# over "neutral"/"negative", which is meaningless for sentiment.
# TODO: If business prefers worst-sentiment or average-score, revisit this rule.
review_w = Window.partitionBy("order_id").orderBy(F.desc("review_answer_timestamp"))
order_review_agg = (
    reviews
    .withColumn("rn", F.row_number().over(review_w))
    .groupBy("order_id")
    .agg(
        F.max(F.when(F.col("rn") == 1, F.col("review_score"))).alias("review_score"),
        F.max(F.when(F.col("rn") == 1, F.col("review_sentiment"))).alias("review_sentiment"),
        F.count("review_id").alias("review_count"),
    )
)

# Join all aggregates to the order base, preserving all orders
fact_order_aggregate = (
    order_base
    .join(order_item_agg, on="order_id", how="left")
    .join(order_payment_agg, on="order_id", how="left")
    .join(order_review_agg, on="order_id", how="left")
)

# Add payment vs order value reconciliation flag
# 1 = values genuinely mismatch, 0 = values match,
# NULL = cannot compare (payment or order total is missing)
fact_order_aggregate = fact_order_aggregate.withColumn(
    "payment_order_mismatch",
    F.when(
        F.col("total_payment_value").isNull() | F.col("total_order_value").isNull(),
        None,
    ).when(
        F.abs(F.col("total_payment_value") - F.col("total_order_value")) > 0.01, 1
    ).otherwise(0),
)

print(f"fact_order_aggregate row count: {fact_order_aggregate.count()}")

# --- DUPLICATE CHECK ---
# Verify no duplicate order_ids in the aggregate
order_dupes = fact_order_aggregate.groupBy("order_id").count().filter("count > 1")
dupe_count = order_dupes.count()
print(f"Duplicate order_ids in aggregate: {dupe_count}")
if dupe_count > 0:
    print("WARNING: Duplicate order_ids found! Investigate before proceeding.")
    display(order_dupes.limit(10))
else:
    print("✅ No duplicate order_ids — aggregate grain is clean (one row per order).")

display(fact_order_aggregate.limit(5))

# COMMAND ----------

# DBTITLE 1,Data validation
# Data validation across all gold tables

print("=" * 60)
print("GOLD TABLE VALIDATION")
print("=" * 60)

# --- Row counts ---
print("\n--- Row Counts ---")
tables_to_check = {
    "dim_customer": dim_customer,
    "dim_product": dim_product,
    "dim_product_category": dim_product_category,
    "dim_seller": dim_seller,
    "dim_date": dim_date,
    "fact_order_items": fact_order_items,
    "fact_order_payments": fact_order_payments,
    "fact_order_reviews": fact_order_reviews,
    "fact_order_aggregate": fact_order_aggregate,
}

for name, df in tables_to_check.items():
    print(f"  {name}: {df.count()} rows")

# --- Referential integrity ---
print("\n--- Referential Integrity Checks ---")

# fact_order_items.customer_id → dim_customer.customer_id
cust_orphans = fact_order_items.join(dim_customer, on="customer_id", how="left_anti")
print(f"  fact_order_items.customer_id orphans: {cust_orphans.count()}")

# fact_order_items.product_id → dim_product.product_id
prod_orphans = fact_order_items.join(dim_product, on="product_id", how="left_anti")
print(f"  fact_order_items.product_id orphans: {prod_orphans.count()}")

# fact_order_items.seller_id → dim_seller.seller_id
seller_orphans = fact_order_items.join(dim_seller, on="seller_id", how="left_anti")
print(f"  fact_order_items.seller_id orphans: {seller_orphans.count()}")

# fact_order_payments.order_id → fact_order_items.order_id (should exist in fact)
pay_order_orphans = fact_order_payments.join(
    orders.select("order_id").distinct(), on="order_id", how="left_anti"
)
print(f"  fact_order_payments.order_id orphans (not in orders): {pay_order_orphans.count()}")

# fact_order_aggregate.order_id → orders.order_id
agg_order_orphans = fact_order_aggregate.join(
    orders.select("order_id").distinct(), on="order_id", how="left_anti"
)
print(f"  fact_order_aggregate.order_id orphans (not in orders): {agg_order_orphans.count()}")

# fact_order_reviews.order_id → orders.order_id
review_order_orphans = fact_order_reviews.join(
    orders.select("order_id").distinct(), on="order_id", how="left_anti"
)
print(f"  fact_order_reviews.order_id orphans (not in orders): {review_order_orphans.count()}")

# dim_product.product_category_name → dim_product_category.product_category_name
prod_cat_orphans = dim_product.join(
    dim_product_category, on="product_category_name", how="left_anti"
).filter(F.col("product_category_name").isNotNull())
print(f"  dim_product.product_category_name orphans (not in dim_product_category): {prod_cat_orphans.count()}")

# --- Duplicate key checks ---
print("\n--- Duplicate Key Checks ---")
checks = [
    ("dim_customer.customer_id", dim_customer.groupBy("customer_id").count().filter("count > 1")),
    ("dim_product.product_id", dim_product.groupBy("product_id").count().filter("count > 1")),
    ("dim_product_category.product_category_name", dim_product_category.groupBy("product_category_name").count().filter("count > 1")),
    ("dim_seller.seller_id", dim_seller.groupBy("seller_id").count().filter("count > 1")),
    ("dim_date.date_key", dim_date.groupBy("date_key").count().filter("count > 1")),
    ("fact_order_items.(order_id, order_item_id)", fact_order_items.groupBy("order_id", "order_item_id").count().filter("count > 1")),
    ("fact_order_payments.(order_id, payment_sequential)", fact_order_payments.groupBy("order_id", "payment_sequential").count().filter("count > 1")),
    ("fact_order_reviews.(review_id, order_id)", fact_order_reviews.groupBy("review_id", "order_id").count().filter("count > 1")),
    ("fact_order_aggregate.order_id", fact_order_aggregate.groupBy("order_id").count().filter("count > 1")),
]
for name, dupe_df in checks:
    dc = dupe_df.count()
    status = "✅ PASS" if dc == 0 else "❌ FAIL"
    print(f"  {name}: {dc} duplicates — {status}")

# --- Null checks on key columns ---
print("\n--- Null Checks on Key Columns ---")
null_checks = [
    ("dim_customer.customer_id", dim_customer.filter(F.col("customer_id").isNull())),
    ("dim_product.product_id", dim_product.filter(F.col("product_id").isNull())),
    ("dim_product_category.product_category_name", dim_product_category.filter(F.col("product_category_name").isNull())),
    ("fact_order_items.order_id", fact_order_items.filter(F.col("order_id").isNull())),
    ("fact_order_items.product_id", fact_order_items.filter(F.col("product_id").isNull())),
    ("fact_order_reviews.review_id", fact_order_reviews.filter(F.col("review_id").isNull())),
    ("fact_order_reviews.order_id", fact_order_reviews.filter(F.col("order_id").isNull())),
    ("fact_order_aggregate.order_id", fact_order_aggregate.filter(F.col("order_id").isNull())),
]
for name, null_df in null_checks:
    nc = null_df.count()
    status = "✅ PASS" if nc == 0 else "❌ FAIL"
    print(f"  {name} nulls: {nc} — {status}")

print("\n" + "=" * 60)
print("Validation complete.")
print("=" * 60)

# COMMAND ----------

# DBTITLE 1,Write gold tables
# Write all gold tables to olist_data.gold as managed Delta tables

gold_tables = {
    "dim_customer": dim_customer,
    "dim_product": dim_product,
    "dim_product_category": dim_product_category,
    "dim_seller": dim_seller,
    "dim_date": dim_date,
    "fact_order_items": fact_order_items,
    "fact_order_payments": fact_order_payments,
    "fact_order_reviews": fact_order_reviews,
    "fact_order_aggregate": fact_order_aggregate,
}

for table_name, df in gold_tables.items():
    full_name = f"olist_data.gold.{table_name}"
    print(f"Writing {full_name}...")
    df.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(full_name)
    print(f"  ✅ {full_name} written ({df.count()} rows)")

print("\n" + "=" * 60)
print("All gold tables written successfully!")
print("=" * 60)
print("\nGold tables created:")
for table_name in gold_tables:
    print(f"  - olist_data.gold.{table_name}")