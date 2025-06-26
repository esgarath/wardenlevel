 import React, { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Users,
  Plus,
  Edit3,
  Eye,
  Save,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
} from "lucide-react";
import "./App.css";

const ProfessionTracker = () => {
  const professions = [
    "Carpentry",
    "Forestry",
    "Mining",
    "Farming",
    "Hunting",
    "Scholar",
    "Fishing",
    "Leatherworking",
    "Smithing",
    "Foraging",
    "Masonry",
    "Tailoring",
  ];

  const [players, setPlayers] = useState([]);
  const [currentView, setCurrentView] = useState("master");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [tempTiers, setTempTiers] = useState({});
  const [newPlayerName, setNewPlayerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [recentChanges, setRecentChanges] = useState([]);
  const [showChanges, setShowChanges] = useState(false);
  const [userId] = useState(`user-${Math.random().toString(36).substr(2, 9)}`);
  const [syncStatus, setSyncStatus] = useState("connecting");

  // Initialize Firestore listeners
  useEffect(() => {
    setSyncStatus("connecting");

    // Listen to players collection
    const playersRef = collection(db, "profession-tracker", "data", "players");
    const unsubscribePlayers = onSnapshot(
      playersRef,
      (snapshot) => {
        const playersData = [];
        snapshot.forEach((doc) => {
          playersData.push({
            firebaseId: doc.id,
            ...doc.data(),
          });
        });
        setPlayers(playersData);
        setIsConnected(true);
        setSyncStatus("connected");
        setLastUpdate(Date.now());
      },
      (error) => {
        console.error("Error listening to players:", error);
        setIsConnected(false);
        setSyncStatus("error");
      }
    );

    // Listen to changes collection
    const changesRef = collection(db, "profession-tracker", "data", "changes");
    const changesQuery = query(
      changesRef,
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsubscribeChanges = onSnapshot(
      changesQuery,
      (snapshot) => {
        const changesData = [];
        snapshot.forEach((doc) => {
          changesData.push(doc.data());
        });
        setRecentChanges(changesData);
      },
      (error) => {
        console.error("Error listening to changes:"