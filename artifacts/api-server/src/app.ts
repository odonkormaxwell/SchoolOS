import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

declare module "express" {
  interface Request {
    session: Record<string, unknown> | null;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET ?? "school-secret-key-2024";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));

const sessions: Record<string, Record<string, unknown>> = {};

app.use((req, _res, next) => {
  const sid = req.signedCookies?.["sid"];
  if (sid && sessions[sid]) {
    req.session = sessions[sid];
  } else {
    req.session = null;
  }
  next();
});

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (req.session !== null) {
      if (!req.signedCookies?.["sid"]) {
        const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessions[sid] = req.session ?? {};
        res.cookie("sid", sid, { signed: true, httpOnly: true, sameSite: "lax" });
      } else {
        const sid = req.signedCookies["sid"];
        sessions[sid] = req.session ?? {};
      }
    }
    return originalJson(body);
  };
  next();
});

app.use("/api", router);

export default app;
