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