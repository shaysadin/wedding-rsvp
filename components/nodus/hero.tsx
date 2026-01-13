"use client";
import React from "react";
import { Container } from "@/components/nodus/container";
import { Heading } from "@/components/nodus/heading";
import { ShimmerText } from "@/components/nodus/shimmer-text";
import { SubHeading } from "@/components/nodus/subheading";
import { GartnerLogo, GartnerLogoText, Star } from "@/components/nodus/icons/general";
import { motion } from "motion/react";
import { Button } from "@/components/nodus/button";
import { Badge } from "@/components/nodus/badge";
import Link from "next/link";

export const Hero = () => {
  return (
    <Container className="border-divide flex flex-col items-center justify-center border-x px-4 pt-10 pb-10 md:pt-32 md:pb-20">
      <Badge text="For fast moving engineering teams." />
      <Heading className="mt-4">
        Manage and simulate <br /> agentic{" "}
        <span className="text-brand">workflows</span>
      </Heading>

      <SubHeading className="mx-auto mt-6 max-w-lg">
        We empower developers and technical teams to create, simulate, and
        manage AI-driven workflows visually
      </SubHeading>

      <div className="mt-6 flex items-center gap-4">
        <Button as={Link} href="/sign-up">
          Start building
        </Button>
        <Button variant="secondary" as={Link} href="/pricing">
          View pricing
        </Button>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <GartnerLogo />
        <div className="flex items-center -space-x-1">
          {[...Array(5)].map((_, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{ duration: 1, delay: index * 0.05 }}
            >
              <Star key={index} />
            </motion.div>
          ))}
        </div>
        <span className="border-l border-gray-500 pl-4 text-[10px] text-gray-600 sm:text-sm">
          Innovative AI solution 2025 by
        </span>
        <GartnerLogoText className="size-12 sm:size-16" />
      </div>
    </Container>
  );
};
