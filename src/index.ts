import express, { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

const app = express();
const PORT = 8080;

function middlewareLogResponses(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    res.on("finish", () => {
        if (res.statusCode >= 400) {
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
        }
    });

    next();
};

function middlewareMetricsInc (
    req: Request,
    res: Response,
    next: NextFunction,
) {
    config.fileserverHits++
    next();
}

function handlerReadiness(req: Request, res: Response) {
  res.type("text/plain").send("OK");
}

function handlerMetrics(req: Request, res: Response) {
    res.type("text/plain").send(`Hits: ${config.fileserverHits}`);
}

function handlerReset(req: Request, res: Response) {
    res.type("text/plain").send("Hits reset to 0");
}

app.use(middlewareLogResponses);

app.get("/healthz", handlerReadiness);

app.use("/app", middlewareMetricsInc);
app.use("/app", express.static("./src/app"));

app.use("/metrics", handlerMetrics);
app.use("/reset", handlerReset);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

