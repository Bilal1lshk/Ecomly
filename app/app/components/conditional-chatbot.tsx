"use client";

import { usePathname } from "next/navigation";
import Chatbot from "./chatbot";

const HIDDEN_ROUTES = ["/login", "/signup"];

export default function ConditionalChatbot() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return <Chatbot />;
}