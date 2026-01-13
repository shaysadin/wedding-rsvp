"use client";
import React, { useMemo, useState } from "react";
import { SubHeading } from "@/components/nodus/subheading";
import { Container } from "@/components/nodus/container";
import { SectionHeading } from "@/components/nodus/seciton-heading";
import { Badge } from "@/components/nodus/badge";
import { Button } from "@/components/nodus/button";
import { DivideX } from "@/components/nodus/divide";
import { AnimatePresence, motion } from "motion/react";
import useMeasure from "react-use-measure";
import { useTranslations } from "next-intl";

const ChevronDownIcon = (
  props: React.SVGProps<SVGSVGElement> & { rotated?: boolean },
) => {
  const { rotated, className, ...rest } = props;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        d="M3.75 6.5L8 10.75L12.25 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const FAQs = () => {
  const t = useTranslations("Marketing.faqs");
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const faqs = [
    { question: t("q1"), answer: t("a1") },
    { question: t("q2"), answer: t("a2") },
    { question: t("q3"), answer: t("a3") },
    { question: t("q4"), answer: t("a4") },
    { question: t("q5"), answer: t("a5") },
    { question: t("q6"), answer: t("a6") },
    { question: t("q7"), answer: t("a7") },
    { question: t("q8"), answer: t("a8") },
  ];

  const toggle = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <Container className="border-divide flex flex-col items-center border-x pt-12">
      <Badge text={t("badge")} />
      <SectionHeading className="mt-4">{t("title")}</SectionHeading>

      <DivideX className="mt-8" />
      <div className="divide-divide w-full divide-y">
        {faqs.map((item, index) => (
          <AccordionItem
            key={item.question}
            index={index}
            question={item.question}
            answer={item.answer}
            isOpen={openItems.has(index)}
            onToggle={() => toggle(index)}
          />
        ))}
      </div>
    </Container>
  );
};

const AccordionItem = ({
  index,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const [ref, { height }] = useMeasure();
  const targetHeight = useMemo(() => (isOpen ? height : 0), [isOpen, height]);

  return (
    <div className="group">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-8 py-6 text-left"
      >
        <span className="text-charcoal-700 text-base font-medium dark:text-neutral-100">
          {question}
        </span>
        <motion.span
          className="text-charcoal-700 shadow-aceternity inline-flex size-6 items-center justify-center rounded-md bg-white dark:bg-neutral-950"
          initial={false}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          style={{ willChange: "transform", backfaceVisibility: "hidden" }}
        >
          <ChevronDownIcon className="dark:text-neutral-100" />
        </motion.span>
      </button>

      <motion.div
        id={`faq-panel-${index}`}
        role="region"
        aria-hidden={!isOpen}
        initial={false}
        animate={{ height: targetHeight, opacity: isOpen ? 1 : 0 }}
        transition={{ height: { duration: 0.35 }, opacity: { duration: 0.2 } }}
        style={{ willChange: "height, opacity", backfaceVisibility: "hidden" }}
        className="overflow-hidden px-8"
        onClick={onToggle}
      >
        <div ref={ref} className="pr-2 pb-5 pl-2 sm:pr-0 sm:pl-0">
          <AnimatePresence mode="popLayout">
            {isOpen && (
              <motion.p
                key="content"
                initial={{ y: -6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ willChange: "transform, opacity", backfaceVisibility: "hidden" }}
                className="text-gray-600 dark:text-neutral-400"
              >
                {answer}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
