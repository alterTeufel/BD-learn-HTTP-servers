import express from "express";

const app = express();

app.listen(8080, () => {
    console.log("Chirpy server listening on port 8080");
});