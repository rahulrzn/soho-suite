# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "5"
# ///
# DBTITLE 1,Bronze Ingestion
# MAGIC %md
# MAGIC # Bronze Ingestion
# MAGIC
# MAGIC Load raw Olist CSV files from `/Volumes/olist_data/raw/olist_files/` into Spark DataFrames.

# COMMAND ----------

# DBTITLE 1,Import Spark Functions
from pyspark.sql import functions as F

# COMMAND ----------

# DBTITLE 1,Load All Source CSVs
base_path = "/Volumes/olist_data/raw/olist_files/"
customer = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_customers_dataset.csv")
)
geolocation = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_geolocation_dataset.csv")
)
order_items = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_order_items_dataset.csv")
)
order_payments = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_order_payments_dataset.csv")
)
order_reviews = (
    spark.read
    .format("csv")
    .option("header", True)
    .option("inferSchema", True)
    .option("multiLine", True)
    .option("quote", '"')
    .option("escape", '"')
    .option("unescapedQuoteHandling", "BACK_TO_DELIMITER")
    .load(base_path+"bronze_order_reviews_dataset.csv")
)
orders = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_orders_dataset.csv")
)
products = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_products_dataset.csv")
)
product_category = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path + "bronze_product_category_name_translation.csv")
)
sellers = (
    spark.read
    .format("csv")
    .option("header",True)
    .option("inferSchema",True)
    .load(base_path+"bronze_sellers_dataset.csv")
)

# COMMAND ----------

# DBTITLE 1,Display Sample Data
print("Customer")
display(customer.limit(10))
print("Geolocation")
display(geolocation.limit(10))
print("Order_items")
display(order_items.limit(10))
print("Order_payments")
display(order_payments.limit(10))
print("Order_reviews")
display(order_reviews.limit(10))
print("Orders")
display(orders.limit(10))
print("Products")
display(products.limit(10))
print("Product_category")
display(product_category.limit(10))
print("Sellers")
display(sellers)

# COMMAND ----------

# DBTITLE 1,Add Ingestion Metadata Columns
from pyspark.sql import functions as F
from pyspark.sql.types import TimestampType

# Add ingestion metadata columns to every DataFrame
# Per Databricks medallion best practices: add provenance/source metadata in Bronze
_ingestion_ts = F.current_timestamp()

# Map each table to its source file name (from the read cell above)
tables = [
    ("customers", customer, "bronze_customers_dataset.csv"),
    ("geolocation", geolocation, "bronze_geolocation_dataset.csv"),
    ("order_items", order_items, "bronze_order_items_dataset.csv"),
    ("order_payments", order_payments, "bronze_order_payments_dataset.csv"),
    ("order_reviews", order_reviews, "bronze_order_reviews_dataset.csv"),
    ("orders", orders, "bronze_orders_dataset.csv"),
    ("products", products, "bronze_products_dataset.csv"),
    ("product_category", product_category, "bronze_product_category_name_translation.csv"),
    ("sellers", sellers, "bronze_sellers_dataset.csv"),
]

for name, df, source_file in tables:
    globals()[name] = (
        df
        .withColumn("_ingestion_timestamp", _ingestion_ts)
        .withColumn("_source_file", F.lit(source_file))
    )
    print(f"{name}: added ingestion metadata columns")

# COMMAND ----------

# DBTITLE 1,Create Bronze Schema
bronze_schema = "olist_data.bronze"
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {bronze_schema}")
print(f"Bronze schema '{bronze_schema}' ready.")

# COMMAND ----------

# DBTITLE 1,Write Bronze Delta Tables
# Write all raw DataFrames to Bronze Delta tables
# Per Databricks medallion best practices: persist raw data as Delta for auditability

tables_to_write = [
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

for table_name, df in tables_to_write:
    full_name = f"{bronze_schema}.{table_name}"
    print(f"Writing {full_name}...")
    (
        df.write
        .format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .saveAsTable(full_name)
    )
    print(f"  {df.count()} rows written to {full_name}")

print("\nAll Bronze Delta tables written successfully.")