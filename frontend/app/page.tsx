"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/api";

export default function Home() {
  useEffect(() => {
    window.location.href = getAccessToken() ? "/dashboard" : "/login";
  }, []);

  return null;
}
