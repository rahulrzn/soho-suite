# Databricks notebook source
# DBTITLE 1,Silver Transformation
# MAGIC %md
# MAGIC # Silver Transformation
# MAGIC
# MAGIC Apply null handling, quality flags, derived columns, and write cleaned data to Delta tables in `olist_data.silver`.

# COMMAND ----------

# DBTITLE 1,Run Bronze Ingestion
# MAGIC %run /Users/rahulrrreji@gmail.com/soho-suite/bronze/01_data_ingestion

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

# DBTITLE 1,Fill Null Product Categories
products = products.withColumn(
    "product_category_name",
    F.coalesce(
        F.col("product_category_name"),
        F.lit("unknown")
    )
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
# MAGIC | `is_late_delivery` | `delivery_delay_days > 0` | Late delivery rate |

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

# is_late_delivery — 1 if delivered after estimated date, 0 otherwise
orders = orders.withColumn(
    "is_late_delivery",
    F.when(F.col("delivery_delay_days") > 0, 1).otherwise(0)
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
# Products: keep numeric nulls as NULL — filling with 0 would change meaning for dimensions/weight
# Only product_category_name was imputed with "unknown" (handled in earlier cell)

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