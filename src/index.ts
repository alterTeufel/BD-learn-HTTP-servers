import express, { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { config } from "./config.js";


class BadRequestError extends Error {}
class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class NotFoundError extends Error {}


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
    res
        .set("Content-Type", "text/html; charset=utf-8")
        .send(`
<html>
    <body>
        <h1>Welcome, Chirpy Admin</h1>
        <p>Chirpy has been visited ${config.fileserverHits} times!</p>
    </body>
</html>`
        );
}

function handlerReset(req: Request, res: Response) {
    config.fileserverHits = 0;
    res.type("text/plain").send("Hits reset to 0");
}

/* function handlerValidateChirp(req: Request, res: Response) {
    let body = "";

    req.on("data", (chunk) => {
        body += chunk.toString();
    });

    req.on("end", () => {
        let parsedBody: unknown;

        try {
            parsedBody = JSON.parse(body);                     
        } catch {
            res.status(400).json({ error: "Something went wrong" });
            return;
        }

        if (
            typeof parsedBody !== "object" ||
            parsedBody === null ||
            !("body" in parsedBody) ||
            typeof parsedBody.body !== "string"
        ) {
            res.status(400).json({ error: "Something went wrong" });
            return;
        }

        if ( parsedBody.body.length > 140) {
            res.status(400).json({ error: "Chirp is too long" });
            return;
        }

        res.status(200).json({ valid: true });
    });
} */



app.use(express.json());

app.use(middlewareLogResponses);

app.get("/api/healthz", handlerReadiness);

app.use("/app", middlewareMetricsInc);
app.use("/app", express.static("./src/app"));

app.get("/admin/metrics", handlerMetrics);
app.post("/admin/reset", handlerReset);

app.post("/api/validate_chirp", async (req: Request, res: Response) => {
    const body: unknown = req.body?.body;

    if (typeof body !== "string") {
        res.status(400).json({ error: "body must be a string" });
        return;
    }

    if (body.length > 140) {
        throw new BadRequestError("Chirp is too long. Max length is 140");
    }

    const cleanedBody = body.replace(
        /(^|\s)(kerfuffle|sharbert|fornax)(?=\s|$)/gi,
        "$1****",
    );

    //res.status(200).json({ valid: true });
    res.status(200).json({ cleanedBody });
});

// Error handling middleware needs to be defined last, after all your
// other app.use() and route handlers (app.post, app.get, etc.),
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof BadRequestError) {
        res.status(400).json({ error: err.message });
    } else if (err instanceof UnauthorizedError) {
        res.status(401).json({ error: err.message });
    } else if (err instanceof ForbiddenError) {
        res.status(403).json({ error: err.message });
    } else if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
    } else {
        console.log(err);
        res.status(500).json({
            error: "Something went wrong on our end",
        });
    }
}

app.use(errorHandler);
// but before app.listen.

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

