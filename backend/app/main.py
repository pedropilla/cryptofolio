from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from databases import Database
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float
from fastapi import File, UploadFile, HTTPException
import csv
from io import StringIO

# FastAPI app
app = FastAPI()

# Database setup
DATABASE_URL = "sqlite:///./transactions.db"
database = Database(DATABASE_URL)
metadata = MetaData()

# Define the transactions table
transactions_table = Table(
    "transactions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("date", String),
    Column("pair", String),
    Column("amount", Float),
    Column("price", Float),
    Column("type", String),
    Column("fees", Float),
)

# Create SQLite database
engine = create_engine(DATABASE_URL)
metadata.create_all(engine)

# Transaction model
class Transaction(BaseModel):
    id: int | None = None  # Auto-increment
    date: str
    pair: str
    amount: float
    price: float
    type: str
    fees: float


@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    query = transactions_table.select()
    return await database.fetch_all(query)


@app.post("/transactions")
async def add_transaction(transaction: Transaction):
    query = transactions_table.insert().values(
        date=transaction.date,
        pair=transaction.pair,
        amount=transaction.amount,
        price=transaction.price,
        type=transaction.type,
        fees=transaction.fees,
    )
    last_record_id = await database.execute(query)
    return {"id": last_record_id, "message": "Transaction added successfully"}


@app.put("/transactions/{transaction_id}")
async def update_transaction(transaction_id: int, transaction: Transaction):
    query = transactions_table.update().where(
        transactions_table.c.id == transaction_id
    ).values(
        date=transaction.date,
        pair=transaction.pair,
        amount=transaction.amount,
        price=transaction.price,
        type=transaction.type,
        fees=transaction.fees,
    )
    result = await database.execute(query)
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction updated successfully"}


@app.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int):
    query = transactions_table.delete().where(transactions_table.c.id == transaction_id)
    result = await database.execute(query)
    if not result:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

@app.get("/balances")
async def get_balances():
    balances = {}
    query = transactions_table.select()
    transactions = await database.fetch_all(query)

    for tx in transactions:
        base_currency, quote_currency = tx["pair"].split("-")
        amount = float(tx["amount"])  # Amount of base currency
        price = float(tx["price"])  # Price per unit of base currency in terms of quote currency
        fees = float(tx["fees"])  # Fees in quote currency

        print(f"Processing transaction: {tx}")  # Debugging transaction details

        if tx["type"] == "buy":
            # Buy: Gain base currency, spend quote currency
            total_cost = amount * price + fees  # Total cost in quote currency
            print(f"  Buy {amount} {base_currency} at {price} {quote_currency} with total cost {total_cost}")
            balances[base_currency] = balances.get(base_currency, 0) + amount
            balances[quote_currency] = balances.get(quote_currency, 0) - total_cost

        elif tx["type"] == "sell":
            # Sell: Lose base currency, gain quote currency
            proceeds = amount * price  # Proceeds in quote currency
            net_proceeds = proceeds - fees  # Deduct fees
            print(f"  Sell {amount} {base_currency} for {proceeds} {quote_currency} with net proceeds {net_proceeds}")
            balances[base_currency] = balances.get(base_currency, 0) - amount
            balances[quote_currency] = balances.get(quote_currency, 0) + net_proceeds

        elif tx["type"] == "transfer":
            # Transfer: Increase balance of base currency
            print(f"  Transfer {amount} {base_currency}")
            balances[base_currency] = balances.get(base_currency, 0) + amount

        print(f"  Balances so far: {balances}")

    print(f"Final Balances: {balances}")  # Final debug output
    return balances

@app.post("/import-csv")
async def import_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    content = await file.read()
    decoded_content = content.decode("utf-8")
    csv_reader = csv.DictReader(StringIO(decoded_content))

    transactions = []
    for row in csv_reader:
        try:
            transactions.append({
                "date": row["date"],
                "pair": row["pair"],
                "amount": float(row["amount"]),
                "price": float(row["price"]),
                "type": row["type"],
                "fees": float(row["fees"]),
            })
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {e}")

    # Insert into the database
    query = transactions_table.insert()
    await database.execute_many(query=query, values=transactions)

    return {"message": f"Successfully imported {len(transactions)} transactions"}
