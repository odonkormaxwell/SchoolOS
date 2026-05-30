import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

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

app.use((req: Request, _res: Response, next: NextFunction) => {
  const sid = (req as any).signedCookies?.["sid"];
  if (sid && sessions[sid]) {
    (req as any).session = sessions[sid];
  } else {
    (req as any).session = null;
  }
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if ((req as any).session !== null) {
      if (!(req as any).signedCookies?.["sid"]) {
        const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessions[sid] = (req as any).session ?? {};
        res.cookie("sid", sid, { signed: true, httpOnly: true, sameSite: "lax" });
      } else {
        const sid = (req as any).signedCookies["sid"];
        sessions[sid] = (req as any).session ?? {};
      }
    }
    return originalJson(body);
  };
  next();
});

app.use("/api", router);

export default app;
