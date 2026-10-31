import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import express, { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { config } from "./config.js";
import { createUser, deleteAllUsers } from "./db/queries/users.js";
import { createChirp, getAllChirps, getChirp } from "./db/queries/chirps.js";


const migrationClient = postgres(config.db.url, { max: 1 });

try {
    await migrate(
        drizzle(migrationClient),
        config.db.migrationConfig,
    );
} finally {
    await migrationClient.end();
}

class BadRequestError extends Error {}
class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class NotFoundError extends Error {}


const app = express();
const PORT = config.api.port;
let hits = config.api.fileserverHits;
const PLATFORM = config.api.platform;


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
    hits++
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
        <p>Chirpy has been visited ${hits} times!</p>
    </body>
</html>`
        );
}

function handlerReset(req: Request, res: Response) {
    hits = 0;
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
app.post("/admin/reset", async (req, res, next) => {
    try {
        if (PLATFORM !== "dev") {
            throw new ForbiddenError("Reset is only available in the dev environment");
        }

        await deleteAllUsers();
        hits = 0;
        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

app.post("/api/users", async (req, res, next) => {
    try {
        const { email } = req.body ?? {};

        if (typeof email !== "string") {
            throw new BadRequestError("Email is required and mut be a string");
        }

        const user = await createUser({ email });

        if (!user) {
            throw new Error("User creation failed");
        }

        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
});

/*
// Old /api/validate chirp -> rpelced by /api/chirps below
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
*/

app.post("/api/chirps", async(req, res, next) => {
    try {
        const { body, userId } = req.body ?? {};

        if (typeof body !== "string") {
            throw new BadRequestError("body must be a string");
        }

        if (body.length > 140) {
            throw new BadRequestError("Chirp is too long. Max length is 140");
        }

        const cleanedBody = body.replace(
            /(^|\s)(kerfuffle|sharbert|fornax)(?=\s|$)/gi,
            "$1****",
        );

        const chirp = await createChirp({
            body: cleanedBody,
            userId,
        });

        res.status(201).json(chirp);
    } catch (err) {
        next(err);
    }
});

app.get("/api/chirps", async (_req, res, next) => {
    try {
        const chirps = await getAllChirps();
        res.status(200).json(chirps);
    } catch (err) {
        next(err);
    }
});

app.get("/api/chirps/:chirpId", async(req, res, next) => {
    try {
        const chirp = await getChirp(req.params.chirpId);

        if (!chirp) {
            throw new NotFoundError("404: Chirp not found");
        }

        res.status(200).json(chirp);
    } catch (err) {
        next(err);
    }
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

