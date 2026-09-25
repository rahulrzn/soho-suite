# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "5"
# ///
# DBTITLE 1,Data Quality Validation
# MAGIC %md
# MAGIC # Data Quality Validation
# MAGIC
# MAGIC Null checks, duplicate detection, referential integrity, date validation, and payment reconciliation across all Olist source tables.

# COMMAND ----------

# DBTITLE 1,Checking Missing Values
# MAGIC %md
# MAGIC ## **Checking Missing Values**

# COMMAND ----------

# DBTITLE 1,Run Bronze Ingestion
# MAGIC %run /Users/rahulrrreji@gmail.com/soho-suite/bronze/01_data_ingestion

# COMMAND ----------

# DBTITLE 1,Missing Value Counts
for df, name in [
    (customer, "Customer"),
    (geolocation, "Geolocation"),
    (order_items, "Order_items"),
    (order_payments, "Order_payments"),
    (order_reviews, "Order_reviews"),
    (orders, "Orders"),
    (products, "Products"),
    (product_category, "Product_category"),
    (sellers, "Sellers"),
]:
    print(f"{name}:")
    cols = df.columns
    null_counts = df.agg(*[F.sum(F.col(c).isNull().cast("int")).alias(c) for c in cols])
    row = null_counts.collect()[0]
    for c in cols:
        print(f"  {c}: {row[c]}")
    print()

# COMMAND ----------

# DBTITLE 1,Null Percentage Per Column
for df, name in [
    (customer, "Customer"),
    (geolocation, "Geolocation"),
    (order_items, "Order_items"),
    (order_payments, "Order_payments"),
    (order_reviews, "Order_reviews"),
    (orders, "Orders"),
    (products, "Products"),
    (product_category, "Product_category"),
    (sellers, "Sellers"),
]:
    
    total_rows = df.count()

    print(f"{name}:")
    null_counts = df.agg(*[(F.sum(F.col(c).isNull().cast("int"))/total_rows*100).alias(c) for c in df.columns])
    row = null_counts.collect()[0]
    for c in df.columns:
        print(f"  {c}: {row[c]:.2f}%")
    print()

# COMMAND ----------

# DBTITLE 1,Products with Null Category
products.filter(
    F.col("product_category_name").isNull()
).select(
    "product_id",
    "product_category_name",
    "product_name_lenght",
    "product_description_lenght",
    "product_photos_qty"
).show()

# COMMAND ----------

# DBTITLE 1,Count Fully Null Products
products.filter(
    F.col("product_category_name").isNull() &
    F.col("product_name_lenght").isNull() &
    F.col("product_description_lenght").isNull() &
    F.col("product_photos_qty").isNull()
).count()

# COMMAND ----------

# DBTITLE 1,Null Delivery Dates by Status
orders.filter(
    F.col("order_delivered_customer_date").isNull()).groupBy("order_status").count().show()

# COMMAND ----------

# DBTITLE 1,Delivered Orders Missing Date
display(
    orders.filter(
        (F.col("order_status") == "delivered") &
        (F.col("order_delivered_customer_date").isNull())
    )
)

# COMMAND ----------

# DBTITLE 1,Duplicate Checks
# MAGIC %md
# MAGIC ## **Duplicate Checks**

# COMMAND ----------

# DBTITLE 1,Orders Duplicate Row Check
total = orders.count()
unique = orders.distinct().count()

print("Total rows:", total)
print("Unique rows:", unique)
print("Duplicate rows:", total - unique)

# COMMAND ----------

# DBTITLE 1,Unique Order ID Check
orders.select(
    F.count("*").alias("rows"),
    F.countDistinct("order_id").alias("unique_order_ids")
).show()

# COMMAND ----------

# DBTITLE 1,Duplicate Checks Other Tables
for name, df, key_cols in [
    ("Order_items", order_items, ["order_id", "order_item_id", "product_id"]),
    ("Order_payments", order_payments, ["order_id", "payment_sequential"]),
    ("Order_reviews", order_reviews, ["review_id"]),
]:
    total = df.count()
    unique = df.distinct().count()
    unique_keys = df.select(*key_cols).distinct().count()
    print(f"{name}: {total} rows, {unique} unique rows, {total - unique} duplicates")
    print(f"  Unique by {key_cols}: {unique_keys}, key duplicates: {total - unique_keys}")

# COMMAND ----------

# DBTITLE 1,Investigate Duplicate Review IDs
# Investigate the 814 duplicate review_ids found above
# Are they exact row duplicates, or same review_id with different data?

dup_review_ids = (
    order_reviews
    .groupBy("review_id")
    .agg(F.count("*").alias("row_count"))
    .filter(F.col("row_count") > 1)
    .orderBy(F.desc("row_count"))
)

print(f"Distinct review_ids with duplicates: {dup_review_ids.count()}")
display(dup_review_ids.limit(20))

# Check if duplicates share the same order_id or map to different orders
dup_diff_orders = (
    order_reviews
    .join(dup_review_ids.select("review_id"), on="review_id", how="inner")
    .groupBy("review_id")
    .agg(F.countDistinct("order_id").alias("distinct_orders"))
    .filter(F.col("distinct_orders") > 1)
)

print(f"\nDuplicate review_ids mapping to different order_ids: {dup_diff_orders.count()}")

# Sample duplicate rows for inspection
print("\nSample duplicate review_id rows:")
display(
    order_reviews
    .join(dup_review_ids.select("review_id"), on="review_id", how="inner")
    .orderBy("review_id")
    .limit(40)
)

# COMMAND ----------

# DBTITLE 1,Referential Integrity Checks
# MAGIC %md
# MAGIC ## **Referential Integrity Checks**

# COMMAND ----------

# DBTITLE 1,Orders Without Matching Customers
missing_customers = (
    orders
    .join(
        customer,
        on="customer_id",
        how="left_anti"
    )
)

print("Orders without matching customer:", missing_customers.count())

# COMMAND ----------

# DBTITLE 1,Order Items Without Matching Products
missing_products = (
    order_items
    .join(
        products.select("product_id"),
        on="product_id",
        how="left_anti"
    )
)

print(
    "Order items without matching product:",
    missing_products.count()
)

# COMMAND ----------

# DBTITLE 1,Referential Integrity Checks
# order_items -> orders
missing_orders_from_items = order_items.join(orders.select("order_id"), on="order_id", how="left_anti")
print("Order items without matching order:", missing_orders_from_items.count())

# order_payments -> orders
missing_orders_from_payments = order_payments.join(orders.select("order_id"), on="order_id", how="left_anti")
print("Order payments without matching order:", missing_orders_from_payments.count())

# order_reviews -> orders
missing_orders_from_reviews = order_reviews.join(orders.select("order_id"), on="order_id", how="left_anti")
print("Order reviews without matching order:", missing_orders_from_reviews.count())

# order_items -> sellers
missing_sellers = order_items.join(sellers.select("seller_id"), on="seller_id", how="left_anti")
print("Order items without matching seller:", missing_sellers.count())

# customers -> geolocation (zip code prefix)
missing_geolocation = customer.join(geolocation.select("geolocation_zip_code_prefix").distinct(), customer.customer_zip_code_prefix == geolocation.geolocation_zip_code_prefix, how="left_anti")
print("Customers without matching geolocation:", missing_geolocation.count())

# COMMAND ----------

# DBTITLE 1,Flag Customers Without Geolocation Match
# 278 customers have no matching geolocation ZIP prefix — document and flag them
# These customers/orders are still valid; geolocation enrichment is simply unavailable

customers_without_geo = (
    customer
    .join(
        geolocation.select("geolocation_zip_code_prefix").distinct(),
        customer.customer_zip_code_prefix == geolocation.geolocation_zip_code_prefix,
        how="left_anti"
    )
)

print(f"Customers without geolocation match: {customers_without_geo.count()}")

# Sample of customers missing geolocation data
display(
    customers_without_geo
    .select("customer_id", "customer_zip_code_prefix", "customer_city", "customer_state")
    .limit(20)
)

# Breakdown by state
print("\nBreakdown by state:")
display(
    customers_without_geo
    .groupBy("customer_state")
    .count()
    .orderBy(F.desc("count"))
)

# COMMAND ----------

# DBTITLE 1,Data Validation Checks
# MAGIC %md
# MAGIC ## **Data Validation Checks**

# COMMAND ----------

# DBTITLE 1,Validate Numeric Values
# Check for negative price or freight_value in order_items
neg_price = order_items.filter(F.col("price") < 0).count()
neg_freight = order_items.filter(F.col("freight_value") < 0).count()
print(f"Order items with negative price: {neg_price}")
print(f"Order items with negative freight_value: {neg_freight}")

# Check for negative payment_value in order_payments
neg_payment = order_payments.filter(F.col("payment_value") < 0).count()
print(f"Order payments with negative payment_value: {neg_payment}")

# Check for zero price (potential data issue)
zero_price = order_items.filter(F.col("price") == 0).count()
print(f"Order items with zero price: {zero_price}")

# COMMAND ----------

# DBTITLE 1,Validate Date Sequences
# Check for illogical date sequences in orders
# delivered before purchased, approved before purchased
invalid_delivered = orders.filter(
    (F.col("order_delivered_customer_date").isNotNull()) &
    (F.col("order_delivered_customer_date") < F.col("order_purchase_timestamp"))
).count()

invalid_approved = orders.filter(
    (F.col("order_approved_at").isNotNull()) &
    (F.col("order_approved_at") < F.col("order_purchase_timestamp"))
).count()

invalid_carrier = orders.filter(
    (F.col("order_delivered_carrier_date").isNotNull()) &
    (F.col("order_delivered_carrier_date") < F.col("order_purchase_timestamp"))
).count()

print(f"Orders delivered before purchase: {invalid_delivered}")
print(f"Orders approved before purchase: {invalid_approved}")
print(f"Orders delivered to carrier before purchase: {invalid_carrier}")

# COMMAND ----------

# DBTITLE 1,Investigate Invalid Carrier Dates
# Investigate the 166 orders where carrier date is before purchase timestamp
invalid_carrier_orders = orders.filter(
    (F.col("order_delivered_carrier_date").isNotNull()) &
    (F.col("order_delivered_carrier_date") < F.col("order_purchase_timestamp"))
)

print(f"Orders with carrier date before purchase: {invalid_carrier_orders.count()}")

# How far off are they (in hours)?
display(
    invalid_carrier_orders
    .withColumn(
        "carrier_before_purchase_hours",
        F.round(
            (F.col("order_purchase_timestamp").cast("long") - F.col("order_delivered_carrier_date").cast("long")) / 3600,
            2
        )
    )
    .select(
        "order_id",
        "order_status",
        "order_purchase_timestamp",
        "order_delivered_carrier_date",
        "carrier_before_purchase_hours"
    )
    .orderBy(F.desc("carrier_before_purchase_hours"))
    .limit(20)
)

# Breakdown by order_status
print("\nBreakdown by order_status:")
display(
    invalid_carrier_orders
    .groupBy("order_status")
    .count()
    .orderBy(F.desc("count"))
)

# COMMAND ----------

# DBTITLE 1,Payment Reconciliation
# MAGIC %md
# MAGIC ## **Payment Reconciliation**

# COMMAND ----------

# DBTITLE 1,Compare Order Totals Including Freight Against Payment
# Join order_items with order_payments on order_id
# Sum price + freight_value per order, then compare to payment_value

order_totals = (
    order_items
    .groupBy("order_id")
    .agg(
        F.sum(F.col("price") + F.col("freight_value")).alias("items_total")
    )
)

payment_totals = (
    order_payments
    .groupBy("order_id")
    .agg(F.sum("payment_value").alias("payments_total"))
)

comparison = (
    order_totals
    .join(payment_totals, on="order_id", how="inner")
    .withColumn(
        "match",
        (F.abs(F.col("items_total") - F.col("payments_total")) < 1).cast("int")
    )
)

print("Order-level comparison: price + freight vs payment_value")
display(comparison.limit(20))

match_count = comparison.filter(F.col("match") == 1).count()
mismatch_count = comparison.filter(F.col("match") == 0).count()
total_count = comparison.count()

print(f"\nTotal orders compared: {total_count}")
print(f"Matching (within $1.00): {match_count} ({match_count / total_count * 100:.2f}%)")
print(f"Mismatching:{mismatch_count} ({mismatch_count / total_count * 100:.2f}%)")

print("\nSample mismatches:")
display(
    comparison
    .filter(F.col("match") == 0)
    .withColumn("difference", F.col("items_total") - F.col("payments_total"))
    .orderBy(F.abs(F.col("difference")))
    .limit(20)
)

# COMMAND ----------

# DBTITLE 1,Describe Differences for Non Matching Records
mismatches = (
    comparison
    .filter(F.col("match") == 0)
    .withColumn("difference", F.col("items_total") - F.col("payments_total"))
)

display(mismatches.describe())

# COMMAND ----------

# DBTITLE 1,Summarize Count by Difference Type in Mismatches
display(
    mismatches
    .withColumn(
        "difference_type",
        F.when(
            F.col("difference") < 0,
            "payment_higher"
        ).otherwise("items_higher")
    )
    .groupBy("difference_type")
    .count()
)

# COMMAND ----------

# DBTITLE 1,Join Mismatch Data with Order Items and Payments
mismatch_details = (
    mismatches
    .join(
        order_items.groupBy("order_id").agg(
            F.count("*").alias("item_count"),
            F.countDistinct("seller_id").alias("seller_count"),
            F.sum("price").alias("price_total"),
            F.sum("freight_value").alias("freight_total")
        ),
        "order_id"
    )
    .join(
        order_payments.groupBy("order_id").agg(
            F.count("*").alias("payment_count"),
            F.collect_set("payment_type").alias("payment_types"),
            F.max("payment_installments").alias("max_installments")
        ),
        "order_id"
    )
)

display(
    mismatch_details.orderBy(
        F.abs(F.col("difference")).desc()
    )
)

# COMMAND ----------

# DBTITLE 1,Summarize Payment Type Differences by Discrepancy Category
display(
    mismatch_details
    .withColumn(
        "difference_type",
        F.when(
            F.col("difference") < 0,
            "payment_higher"
        ).otherwise("items_higher")
    )
    .withColumn("payment_type", F.explode("payment_types"))
    .groupBy("payment_type", "difference_type")
    .count()
    .orderBy("payment_type", "difference_type")
)