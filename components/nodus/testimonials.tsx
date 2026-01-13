"use client";
import React, { useEffect, useState } from "react";
import { Container } from "./container";
import { DivideX } from "./divide";
import { Dot } from "./common/dots";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { PixelatedCanvas } from "./pixelated-canvas";
import { useTranslations } from "next-intl";
import { coupleLogos } from "./couple-logos";

// Avatar URLs for testimonials
const avatars = [
  "https://images.unsplash.com/photo-1622495966027-e0173192c728?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0",
];

const totalTestimonials = 8;

export const Testimonials = () => {
  const t = useTranslations("Marketing.testimonials");
  const [currentIndex, setCurrentIndex] = useState(0);

  const getCurrentItem = (index: number) => ({
    quote: t(`items.${index + 1}.quote`),
    name: t(`items.${index + 1}.name`),
    position: t(`items.${index + 1}.position`),
    company: t(`items.${index + 1}.company`),
    sideText: t(`items.${index + 1}.sideText`),
    sideSubText: t(`items.${index + 1}.sideSubText`),
    avatar: avatars[index],
    logoIndex: index + 1,
  });

  const selectedTestimonial = getCurrentItem(currentIndex);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalTestimonials);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [currentIndex]);
  return (
    <>
      <Container className="border-divide border-x">
        <h2 className="pt-20 pb-10 text-center font-mono text-sm tracking-tight text-neutral-500 uppercase dark:text-neutral-400">
          {t("title")}
        </h2>
      </Container>
      <DivideX />
      <Container className="border-divide relative border-x">
        <Dot top left />
        <Dot top right />
        <Dot bottom left />
        <Dot bottom right />

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={currentIndex}
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
            }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
            className="divide-divide grid grid-cols-1 items-stretch divide-x bg-gray-100 md:h-[28rem] md:grid-cols-4 dark:bg-neutral-800"
          >
            <div className="col-span-4 flex flex-col gap-10 px-4 py-10 md:flex-row md:py-0 lg:col-span-3">
              <Image
                src={selectedTestimonial.avatar}
                alt={selectedTestimonial.name}
                width={400}
                height={400}
                className="m-4 hidden aspect-square rounded-xl object-cover md:block"
                draggable={false}
              />
              <div className="flex flex-col items-start justify-between gap-4 py-4 pr-8">
                <div>
                  {(() => {
                    const LogoComponent = coupleLogos[selectedTestimonial.logoIndex as keyof typeof coupleLogos];
                    return LogoComponent ? <LogoComponent className="h-10" /> : null;
                  })()}
                  <blockquote className="text-charcoal-900 mt-6 text-xl leading-relaxed dark:text-neutral-100">
                    &quot;{selectedTestimonial.quote}&quot;
                  </blockquote>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <Image
                    src={selectedTestimonial.avatar}
                    alt={selectedTestimonial.name}
                    width={400}
                    height={400}
                    className="aspect-square w-10 rounded-xl object-cover md:hidden"
                  />
                  <div>
                    <p className="text-charcoal-900 font-semibold dark:text-neutral-100">
                      {selectedTestimonial.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                      {selectedTestimonial.position},{" "}
                      {selectedTestimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden flex-col justify-end px-4 pb-4 lg:col-span-1 lg:flex">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-charcoal-700 text-7xl font-semibold dark:text-neutral-100">
                    {selectedTestimonial.sideText}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-neutral-400">
                    {selectedTestimonial.sideSubText}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="border-divide grid grid-cols-2 border-t md:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => {
            const LogoComponent = coupleLogos[(index + 1) as keyof typeof coupleLogos];
            return (
              <button
                key={`testimonial-${index}`}
                className={cn(
                  "border-divide group relative overflow-hidden",
                  "border-r md:border-r-0",
                  index % 2 === 0 ? "border-r" : "",
                  index < 6 ? "border-b md:border-b-0" : "",
                  "md:border-r-0",
                  index % 4 !== 3 ? "md:border-r" : "",
                  index < 4 ? "md:border-b" : "",
                )}
                onClick={() => {
                  setCurrentIndex(index);
                }}
              >
                {currentIndex === index && (
                  <PixelatedCanvas
                    key={`canvas-${index}`}
                    isActive={true}
                    fillColor="var(--color-canvas)"
                    backgroundColor="var(--color-canvas-fill)"
                    size={2.5}
                    duration={2500}
                    className="absolute inset-0 scale-[1.01] opacity-20"
                  />
                )}
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={`logo-${index}`}
                    className={cn(
                      "group flex min-h-32 items-center justify-center p-4 py-10 transition-all duration-500",
                      currentIndex === index ? "opacity-100" : "opacity-70 grayscale hover:opacity-100"
                    )}
                    initial={{
                      y: 80,
                      opacity: 0,
                    }}
                    animate={{
                      y: 0,
                      opacity: currentIndex === index ? 1 : 0.7,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                    whileHover={{
                      opacity: 1,
                    }}
                  >
                    {LogoComponent && <LogoComponent className="h-8 transition-all duration-500" />}
                  </motion.div>
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </Container>
    </>
  );
};
