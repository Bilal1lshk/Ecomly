"use client";

import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import Features from "./components/Features";
import Workflow from "./components/Workflow";
import Stats from "./components/Stats";
import Testimonials from "./components/Testimonials";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <Workflow />
        <Stats />
        <Testimonials />
        <CTA />
      </main>
      <Footer />

      <style jsx global>{`
        /* scroll reveal */
        .reveal {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* marquee */
        @keyframes ecomlyMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee { animation: ecomlyMarquee 26s linear infinite; }

        /* floating chips */
        @keyframes ecomlyFloatA {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(-1deg); }
        }
        @keyframes ecomlyFloatB {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        .float-a { animation: ecomlyFloatA 6s ease-in-out infinite; }
        .float-b { animation: ecomlyFloatB 7s ease-in-out infinite 0.6s; }

        /* gentle tilt on hero mock */
        .tilt { transform: perspective(1200px) rotateY(-6deg) rotateX(2deg); }

        /* pulsing dot */
        @keyframes ecomlyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(199, 91, 58, 0.5); }
          70% { box-shadow: 0 0 0 7px rgba(199, 91, 58, 0); }
        }
        .pulse-dot { animation: ecomlyPulse 2s infinite; }

        /* hand-drawn underline draw-in */
        .squiggle path {
          stroke-dasharray: 240;
          stroke-dashoffset: 240;
          animation: ecomlyDraw 1.1s ease 0.6s forwards;
        }
        @keyframes ecomlyDraw {
          to { stroke-dashoffset: 0; }
        }

        /* shine sweep on primary CTA */
        .btn-shine { position: relative; overflow: hidden; }
        .btn-shine::after {
          content: "";
          position: absolute;
          top: 0; left: -120%;
          width: 60%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: skewX(-20deg);
          animation: ecomlyShine 3.8s ease-in-out infinite;
        }
        @keyframes ecomlyShine {
          0% { left: -120%; }
          55%, 100% { left: 130%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal, .marquee, .float-a, .float-b, .pulse-dot, .btn-shine::after {
            animation: none !important;
            transition: none !important;
          }
          .reveal { opacity: 1; transform: none; }
          .squiggle path { stroke-dashoffset: 0; animation: none; }
        }
      `}</style>
    </div>
  );
}
