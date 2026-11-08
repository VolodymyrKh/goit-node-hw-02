import type { RequestHandler } from "express";
import type { ZodType, core } from "zod";

type Source = "body" | "params" | "query";

// "username: Too small..." or just the message for object-level (refine) issues
const formatIssue = (issue: core.$ZodIssue): string =>
  issue.path.length > 0
    ? `${issue.path.join(".")}: ${issue.message}`
    : issue.message;

const validate =
  (source: Source, schema: ZodType): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: { [source]: result.error.issues.map(formatIssue) },
      });
      return;
    }

    // Replace raw input with parsed data (coerced numbers, defaults, trimmed strings).
    // In Express 5 req.query is a getter, so it can't be assigned directly.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[source] = result.data;
    }

    next();
  };

export const validateBody = (schema: ZodType) => validate("body", schema);
export const validateParams = (schema: ZodType) => validate("params", schema);
export const validateQuery = (schema: ZodType) => validate("query", schema);
