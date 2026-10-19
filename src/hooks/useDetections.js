import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { NODE_ID, RANGES } from "../lib/utils";
import { DEMO, generateDemoHistory, generateLiveEvent } from "../lib/demo";

const MAX_EVENTS = 1000;

export function useDetections(rangeId, onNewEvent) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(DEMO);
  const [error, setError] = useState("");
  const [flashId, setFlashId] = useState(null);
  const [connectionLog, setConnectionLog] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  const onNewRef = useRef(onNewEvent);
  useEffect(() => {
    onNewRef.current = onNewEvent;
  }, [onNewEvent]);

  const demoStore = useRef(null);

  const rangeMs = RANGES.find((r) => r.id === rangeId)?.ms ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    if (DEMO) {
      if (!demoStore.current) demoStore.current = generateDemoHistory();
      const cutoff = rangeMs ? Date.now() - rangeMs : 0;
      await new Promise((r) => setTimeout(r, 450));
      setEvents(demoStore.current.filter((e) => new Date(e.created_at).getTime() >= cutoff));
      setLastSync(Date.now());
      setLoading(false);
      return;
    }

    let query = supabase
      .from("detections")
      .select("*")
      .eq("node_id", NODE_ID)
      .order("created_at", { ascending: false })
      .limit(MAX_EVENTS);
    if (rangeMs) query = query.gte("created_at", new Date(Date.now() - rangeMs).toISOString());

    const { data, error: dbError } = await query;
    if (dbError) {
      setError(dbError.message);
      setEvents([]);
    } else {
      setEvents(data || []);
      setLastSync(Date.now());
    }
    setLoading(false);
  }, [rangeMs]);

  useEffect(() => {
    load();
  }, [load]);

  const ingest = useCallback((row) => {
    if (demoStore.current) demoStore.current = [row, ...demoStore.current];
    setEvents((current) => [row, ...current.filter((e) => e.id !== row.id)].slice(0, MAX_EVENTS));
    setFlashId(row.id);
    setTimeout(() => setFlashId((id) => (id === row.id ? null : id)), 2400);
    setLastSync(Date.now());
    onNewRef.current?.(row);
  }, []);

  const logConnection = useCallback((status) => {
    setConnectionLog((log) => {
      if (log[0]?.status === status) return log;
      return [{ status, at: Date.now() }, ...log].slice(0, 12);
    });
  }, []);

  useEffect(() => {
    if (DEMO) {
      logConnection("DEMO");
      const id = setInterval(() => ingest(generateLiveEvent()), 11000);
      return () => clearInterval(id);
    }

    const channel = supabase
      .channel("wildlife-live-detections")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "detections", filter: `node_id=eq.${NODE_ID}` },
        (payload) => ingest(payload.new)
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        logConnection(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ingest, logConnection]);

  return { events, loading, connected, error, refresh: load, flashId, connectionLog, lastSync, demo: DEMO };
}
