# Databricks notebook source
# DBTITLE 1,Data Understanding
# MAGIC %md
# MAGIC # Data Understanding
# MAGIC
# MAGIC Profile schemas, row counts, and value distributions across all Olist source tables.

# COMMAND ----------

# DBTITLE 1,Run Bronze Ingestion
# MAGIC %run /Users/rahulrrreji@gmail.com/soho-suite/data-engineering/bronze/01_bronze_ingestion

# COMMAND ----------

# DBTITLE 1,Row Counts Per Table
print("Customer : " + str(customer.count()))
print("Geolocation : " + str(geolocation.count()))
print("Order_items : " + str(order_items.count()))
print("Order_payments : " + str(order_payments.count()))
print("Order_reviews : " + str(order_reviews.count()))
print("Orders : " + str(orders.count()))
print("Products : " + str(products.count()))
print("Product_category : " + str(product_category.count()))
print("Sellers : "+ str(sellers.count()))

# COMMAND ----------

# DBTITLE 1,Columns Per Table
print(f"Customer : {len(customer.columns)} | columns : "+ str(customer.columns))
print("\n")
print(f"Geolocation : {len(geolocation.columns)} | columns : "+ str(geolocation.columns))
print("\n")
print(f"Order_items : {len(order_items.columns)} | columns : "+ str(order_items.columns))
print("\n")
print(f"Order_payments : {len(order_payments.columns)} | columns : "+ str(order_payments.columns))
print("\n")
print(f"Order_reviews : {len(order_reviews.columns)} | columns : "+ str(order_reviews.columns))
print("\n")
print(f"Orders : {len(orders.columns)} | columns : "+ str(orders.columns))
print("\n")
print(f"Products : {len(products.columns)} | columns : "+ str(products.columns))
print("\n")
print(f"Product_category : {len(product_category.columns)} | columns : "+ str(product_category.columns))
print("\n")
print(f"Sellers : {len(sellers.columns)} | columns : "+ str(sellers.columns))

# COMMAND ----------

# DBTITLE 1,Print All Schemas
customer.printSchema()
geolocation.printSchema()
order_items.printSchema()
order_payments.printSchema()
order_reviews.printSchema()
orders.printSchema()
products.printSchema()
product_category.printSchema()
sellers.printSchema()

# COMMAND ----------

# DBTITLE 1,Describe All Tables
print("Customer")
display(customer.describe())
print("Geolocation")
display(geolocation.describe())
print("Order_items")
display(order_items.describe())
print("Order_payments")
display(order_payments.describe())
print("Order_reviews")
display(order_reviews.describe())
print("Orders")
display(orders.describe())
print("Products")
display(products.describe())
print("Product_category")
display(product_category.describe())
print("Sellers")
display(sellers.describe())

# COMMAND ----------

# DBTITLE 1,Distinct Product Categories
products.select("product_category_name").distinct().show()

# COMMAND ----------

# DBTITLE 1,Distinct Payment Types
order_payments.select("payment_type").distinct().show()

# COMMAND ----------

# DBTITLE 1,Order Status Distribution
display(
    orders
    .groupBy("order_status")
    .count()
    .orderBy(F.desc("count"))
)

# COMMAND ----------

# DBTITLE 1,Order Date Range
orders.select(
    F.min("order_purchase_timestamp").alias("first_order"),
    F.max("order_purchase_timestamp").alias("last_order")
).show(truncate=False)

# COMMAND ----------

# DBTITLE 1,Review Score Distribution
display(
    order_reviews
    .groupBy("review_score")
    .count()
    .orderBy(F.desc("count"))
)