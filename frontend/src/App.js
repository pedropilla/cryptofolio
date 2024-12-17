import React, { useEffect, useState } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Select,
    MenuItem,
    Button,
    Box,
} from "@mui/material";

function App() {
    const [transactions, setTransactions] = useState([]);
    const [balances, setBalances] = useState({});
    const [currentTransactionId, setCurrentTransactionId] = useState(null);
    const [formTransaction, setFormTransaction] = useState({
        date: "",
        pair: "",
        amount: 0,
        price: 0,
        total: 0, // New total field
        type: "buy",
        fees: 0,
    });
    const [file, setFile] = useState(null); // State for CSV file

    useEffect(() => {
        fetchTransactions();
        fetchBalances();
    }, []);

    const fetchTransactions = () => {
        fetch("/api/transactions")
            .then((res) => res.json())
            .then((data) => setTransactions(data))
            .catch((err) => console.error("Error fetching transactions:", err));
    };

    const fetchBalances = () => {
        fetch("/api/balances")
            .then((res) => res.json())
            .then((data) => setBalances(data))
            .catch((err) => console.error("Error fetching balances:", err));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Update the form state
        setFormTransaction((prev) => {
            const updatedTransaction = { ...prev, [name]: value };

            // Auto-calculate price when total is entered
            if (name === "total" && updatedTransaction.amount > 0) {
                updatedTransaction.price = parseFloat(value) / updatedTransaction.amount;
            }

            // Auto-calculate total when price is entered
            if (name === "price" && updatedTransaction.amount > 0) {
                updatedTransaction.total = parseFloat(value) * updatedTransaction.amount;
            }

            return updatedTransaction;
        });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleFileUpload = () => {
        if (!file) {
            alert("Please select a CSV file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        fetch("/api/import-csv", {
            method: "POST",
            body: formData,
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to upload CSV");
                return res.json();
            })
            .then((data) => {
                alert(data.message);
                fetchTransactions();
            })
            .catch((err) => console.error("Error uploading CSV:", err));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const method = currentTransactionId ? "PUT" : "POST";
        const endpoint = currentTransactionId
            ? `/api/transactions/${currentTransactionId}`
            : "/api/transactions";

        fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formTransaction, id: currentTransactionId }),
        })
            .then((res) => res.json())
            .then(() => {
                fetchTransactions();
                fetchBalances();
                resetForm();
            })
            .catch((err) => console.error("Error submitting transaction:", err));
    };

    const handleDelete = (id) => {
        fetch(`/api/transactions/${id}`, { method: "DELETE" })
            .then(() => {
                fetchTransactions();
                fetchBalances();
            })
            .catch((err) => console.error("Error deleting transaction:", err));
    };

    const handleEdit = (id) => {
        const tx = transactions.find((t) => t.id === id);
        setCurrentTransactionId(id);
        setFormTransaction(tx);
    };

    const resetForm = () => {
        setCurrentTransactionId(null);
        setFormTransaction({
            date: "",
            pair: "",
            amount: 0,
            price: 0,
            total: 0,
            type: "buy",
            fees: 0,
        });
    };

    return (
        <div>
            {/* App Bar */}
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Crypto Portfolio Tracker
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Main Container */}
            <Container>
                {/* CSV Upload Section */}
                <Box sx={{ marginY: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Import Transactions from CSV
                    </Typography>
                    <input type="file" accept=".csv" onChange={handleFileChange} />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleFileUpload}
                        sx={{ marginLeft: 2 }}
                    >
                        Upload CSV
                    </Button>
                </Box>

                {/* Balances */}
                <Box sx={{ marginY: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Balances
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Currency</TableCell>
                                    <TableCell>Balance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(balances).map((currency) => (
                                    <TableRow key={currency}>
                                        <TableCell>{currency}</TableCell>
                                        <TableCell>{balances[currency]}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* Transactions Table */}
                <Box sx={{ marginY: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Transactions
                    </Typography>

                    {/* Transaction Form */}
                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
                            <TextField
                                type="date"
                                name="date"
                                label="Date"
                                value={formTransaction.date}
                                onChange={handleInputChange}
                                required
                                fullWidth
                            />
                            <TextField
                                name="pair"
                                label="Pair (e.g., BTC-DCR)"
                                value={formTransaction.pair}
                                onChange={handleInputChange}
                                required
                                fullWidth
                            />
                            <TextField
                                type="number"
                                name="amount"
                                label="Amount"
                                value={formTransaction.amount}
                                onChange={handleInputChange}
                                required
                                fullWidth
                            />
                            <TextField
                                type="number"
                                name="total"
                                label="Total (e.g., BTC)"
                                value={formTransaction.total}
                                onChange={handleInputChange}
                                fullWidth
                            />
                            <TextField
                                type="number"
                                name="price"
                                label="Price (e.g., BTC/DCR)"
                                value={formTransaction.price}
                                onChange={handleInputChange}
                                required
                                fullWidth
                            />
                            <Select
                                name="type"
                                value={formTransaction.type}
                                onChange={handleInputChange}
                                fullWidth
                            >
                                <MenuItem value="buy">Buy</MenuItem>
                                <MenuItem value="sell">Sell</MenuItem>
                                <MenuItem value="transfer">Transfer</MenuItem>
                            </Select>
                            <TextField
                                type="number"
                                name="fees"
                                label="Fees in BTC"
                                value={formTransaction.fees}
                                onChange={handleInputChange}
                                required
                                fullWidth
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <Button type="submit" variant="contained" color="primary">
                                {currentTransactionId ? "Update" : "Add"} Transaction
                            </Button>
                            {currentTransactionId && (
                                <Button variant="outlined" onClick={resetForm}>
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </form>
                    {/* Transactions Table */}
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Pair</TableCell>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Total</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Fees</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.map((tx) => {
                                    const total = tx.amount * tx.price;
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{tx.date}</TableCell>
                                            <TableCell>{tx.pair}</TableCell>
                                            <TableCell>{tx.amount}</TableCell>
                                            <TableCell>{total.toFixed(8)}</TableCell>
                                            <TableCell>{tx.price}</TableCell>
                                            <TableCell>{tx.type}</TableCell>
                                            <TableCell>{tx.fees}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => handleEdit(tx.id)}
                                                    sx={{ marginRight: 1 }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => handleDelete(tx.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Container>
        </div>
    );
}

export default App;