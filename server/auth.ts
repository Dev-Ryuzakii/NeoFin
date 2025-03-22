import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(provided: string, stored: string) {
  const [hash, salt] = stored.split(".");
  const hashBuffer = Buffer.from(hash, "hex");
  const providedBuffer = (await scryptAsync(provided, salt, 64)) as Buffer;
  return timingSafeEqual(hashBuffer, providedBuffer);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.accountNumber));
  passport.deserializeUser(async (accountNumber: string, done) => {
    try {
      const user = await storage.getUser(accountNumber);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username: req.body.username,
        password: await hashPassword(req.body.password),
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          accountNumber: user.accountNumber,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          balance: user.balance,
          kycVerified: user.kycVerified,
          email: user.email,
          phone: user.phone,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({
      accountNumber: req.user.accountNumber,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
      balance: req.user.balance,
      kycVerified: req.user.kycVerified,
      email: req.user.email,
      phone: req.user.phone,
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({
      accountNumber: req.user.accountNumber,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
      balance: req.user.balance,
      kycVerified: req.user.kycVerified,
      email: req.user.email,
      phone: req.user.phone,
    });
  });
}
