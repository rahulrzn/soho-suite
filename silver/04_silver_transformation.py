# Databricks notebook source
# DBTITLE 1,Silver Transformation
# MAGIC %md
# MAGIC # Silver Transformation
# MAGIC
# MAGIC Apply null handling, quality flags, derived columns, and write cleaned data to Delta tables in `olist_data.silver`.

# COMMAND ----------

# DBTITLE 1,Run Bronze Ingestion
# MAGIC %run /Users/rahulrrreji@gmail.com/soho-suite/data-engineering/bronze/01_bronze_ingestion

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

# DBTITLE 1,Verify Products Nulls (Kept as NULL)
# Products: keep numeric nulls as NULL — filling with 0 would change meaning for dimensions/weight
# Only product_category_name was imputed with "unknown" (handled in earlier cell)

print("Products remaining nulls (numeric fields kept as NULL):")
products.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in products.columns]).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Verify Review Nulls (Kept as NULL)
# Order reviews: keep null comment fields as NULL — empty strings would conflate "no comment" with "blank comment"
# Only review_sentiment was added (handled in later cell)

print("Order reviews remaining nulls (comment fields kept as NULL):")
order_reviews.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in order_reviews.columns]).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Add Order Date Missing Flags
# Orders: keep remaining date nulls as-is (previous coalesce with None was a no-op)
orders = orders.withColumn(
    "approved_date_missing_flag", F.when(F.col("order_approved_at").isNull(), 1).otherwise(0)
).withColumn(
    "carrier_date_missing_flag", F.when(F.col("order_delivered_carrier_date").isNull(), 1).otherwise(0)
)

print("Orders remaining nulls (dates kept as NULL, flags added):")
orders.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in orders.columns]).show(truncate=False)

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
silver_schema = "olist_data.silver"
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {silver_schema}")

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