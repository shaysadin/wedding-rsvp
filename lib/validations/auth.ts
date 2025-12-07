import * as z from "zod"

// Simple email-only schema for magic link login
export const userAuthSchema = z.object({
  email: z.string().email(),
})

// Full registration schema with name and password
export const userRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Login schema with email and password
export const userLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})
