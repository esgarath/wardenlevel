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
        console.error("Error listening to changes:", error);
      }
    );

    return () => {
      unsubscribePlayers();
      unsubscribeChanges();
    };
  }, []);

  const getTierInfo = (tier) => {
    if (!tier || tier === 0)
      return { tier: 0, color: "bg-gray-400", name: "No Tier" };
    if (tier === 1) return { tier: 1, color: "bg-gray-700", name: "T1" };
    if (tier === 2) return { tier: 2, color: "bg-green-700", name: "T2" };
    if (tier === 3) return { tier: 3, color: "bg-blue-700", name: "T3" };
    if (tier === 4) return { tier: 4, color: "bg-purple-700", name: "T4" };
    if (tier === 5) return { tier: 5, color: "bg-yellow-500 text-black", name: "T5" };
    if (tier === 6) return { tier: 6, color: "bg-indigo-700", name: "T6" };
    if (tier === 7) return { tier: 7, color: "bg-red-700", name: "T7" };
    if (tier === 8) return { tier: 8, color: "bg-pink-700", name: "T8" };
    if (tier === 9) return { tier: 9, color: "bg-black", name: "T9" };
    return { tier: 0, color: "bg-gray-400", name: "No Tier" };
  };

  const addChange = useCallback(
    async (type, details) => {
      try {
        const changesRef = collection(
          db,
          "profession-tracker",
          "data",
          "changes"
        );
        await addDoc(changesRef, {
          type,
          details,
          user: userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Error adding change:", error);
      }
    },
    [userId]
  );

  const updatePlayer = useCallback(
    async (player) => {
      try {
        setSyncStatus("syncing");
        const playerRef = doc(
          db,
          "profession-tracker",
          "data",
          "players",
          player.firebaseId || player.id.toString()
        );
        await setDoc(playerRef, {
          ...player,
          lastUpdated: Date.now(),
          updatedBy: userId,
        });
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("connected"), 1000);
      } catch (error) {
        console.error("Error updating player:", error);
        setSyncStatus("error");
      }
    },
    [userId]
  );

  const deletePlayer = async (playerId) => {
    if (!isConnected) return;

    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    if (window.confirm(`Are you sure you want to delete ${player.name}?`)) {
      try {
        setSyncStatus("syncing");
        const playerRef = doc(
          db,
          "profession-tracker",
          "data",
          "players",
          player.firebaseId || player.id.toString()
        );
        await deleteDoc(playerRef);

        await addChange("player_deleted", { playerName: player.name });
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("connected"), 1000);
      } catch (error) {
        console.error("Error deleting player:", error);
        setSyncStatus("error");
      }
    }
  };

  const toggleOnlineStatus = async (id) => {
    if (!isConnected) return;

    const player = players.find((p) => p.id === id);
    if (!player) return;

    const updatedPlayer = { ...player, online: !player.online };
    await updatePlayer(updatedPlayer);
    await addChange("status_changed", {
      playerName: player.name,
      status: !player.online ? "online" : "offline",
    });
  };

  const addNewPlayer = async () => {
    if (!newPlayerName.trim() || !isConnected) return;

    setSyncStatus("syncing");
    try {
      const emptyTiers = {};
      professions.forEach((prof) => (emptyTiers[prof] = 0));

      const newPlayer = {
        id: Date.now(),
        name: newPlayerName.trim(),
        online: false,
        tiers: emptyTiers,
        createdAt: Date.now(),
        updatedBy: userId,
      };

      const playerRef = doc(
        db,
        "profession-tracker",
        "data",
        "players",
        newPlayer.id.toString()
      );
      await setDoc(playerRef, newPlayer);

      await addChange("player_added", { playerName: newPlayer.name });
      setNewPlayerName("");
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("connected"), 1000);
    } catch (error) {
      console.error("Error adding player:", error);
      setSyncStatus("error");
    }
  };

  const startEditing = (player) => {
    setEditingPlayer(player.id);
    setTempTiers({ ...player.tiers });
  };

  const saveEditing = async () => {
    if (!isConnected) return;

    const player = players.find((p) => p.id === editingPlayer);
    if (!player) return;

    const changes = [];
    Object.keys(tempTiers).forEach((profession) => {
      if (tempTiers[profession] !== player.tiers[profession]) {
        changes.push({
          profession,
          oldTier: player.tiers[profession],
          newTier: tempTiers[profession],
        });
      }
    });

    const updatedPlayer = { ...player, tiers: tempTiers };
    await updatePlayer(updatedPlayer);

    if (changes.length > 0) {
      await addChange("tiers_updated", {
        playerName: player.name,
        changes,
      });
    }

    setEditingPlayer(null);
    setTempTiers({});
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setTempTiers({});
  };

  const updateTempTier = (profession, value) => {
    const tier = Math.max(0, Math.min(9, parseInt(value) || 0));
    setTempTiers({ ...tempTiers, [profession]: tier });
  };

  const getFilteredPlayers = () => {
    let filtered = players;

    if (currentView === "master" && searchTerm) {
      filtered = filtered.filter((player) =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showOnlineOnly) {
      filtered = filtered.filter((player) => player.online);
    }

    if (currentView === "profession" && selectedProfession) {
      return filtered.sort((a, b) => {
        if (a.online !== b.online) return b.online - a.online;
        return (
          (b.tiers[selectedProfession] || 0) -
          (a.tiers[selectedProfession] || 0)
        );
      });
    }

    return filtered.sort((a, b) => {
      if (a.online !== b.online) return b.online - a.online;
      return a.name.localeCompare(b.name);
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case "connecting":
        return {
          color: "bg-yellow-100 text-yellow-700",
          icon: RefreshCw,
          text: "Connecting...",
          spin: true,
        };
      case "connected":
        return {
          color: "bg-green-100 text-green-700",
          icon: Wifi,
          text: "Connected",
          spin: false,
        };
      case "syncing":
        return {
          color: "bg-blue-100 text-blue-700",
          icon: RefreshCw,
          text: "Syncing...",
          spin: true,
        };
      case "synced":
        return {
          color: "bg-green-100 text-green-700",
          icon: Wifi,
          text: "Synced",
          spin: false,
        };
      case "error":
        return {
          color: "bg-red-100 text-red-700",
          icon: WifiOff,
          text: "Connection error",
          spin: false,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700",
          icon: WifiOff,
          text: "Disconnected",
          spin: false,
        };
    }
  };

  const PlayerCard = ({ player }) => {
    const isEditing = editingPlayer === player.id;
    const timeSinceUpdate = Date.now() - (player.lastUpdated || 0);
    const isRecentlyUpdated = timeSinceUpdate < 5000;

    if (currentView === "profession" && selectedProfession) {
      const tier = player.tiers[selectedProfession] || 0;
      const tierInfo = getTierInfo(tier);

      return (
        <div
          className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
            player.online
              ? "border-green-400 bg-green-50"
              : "border-gray-300 bg-gray-50"
          } ${isRecentlyUpdated ? "ring-2 ring-blue-300 ring-opacity-50" : ""}`}
        >
          <div className="flex items-center justify-between px-8">
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full ${
                  player.online ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              <h3 className="font-semibold text-lg">{player.name}</h3>
              {isRecentlyUpdated && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Just updated
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <p className="text-gray-600">{selectedProfession}</p>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.color} w-20 text-center`}
              >
                {tier === 0 ? "None" : tierInfo.name}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
          player.online
            ? "border-green-400 bg-green-50"
            : "border-gray-300 bg-gray-50"
        } ${isEditing ? "ring-2 ring-blue-300" : ""} ${
          isRecentlyUpdated ? "ring-2 ring-blue-300 ring-opacity-50" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toggleOnlineStatus(player.id)}
              disabled={!isConnected}
              className={`w-4 h-4 rounded-full transition-colors hover:scale-110 ${
                player.online
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-400 hover:bg-gray-500"
              } cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
            ></button>
            <h3 className="font-semibold text-lg">{player.name}</h3>
            {isRecentlyUpdated && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                Just updated
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => startEditing(player)}
                  disabled={!isConnected}
                  className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => deletePlayer(player.id)}
                  disabled={!isConnected}
                  className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveEditing}
                  disabled={!isConnected}
                  className="p-2 rounded-full bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {professions.map((profession) => {
            const tier = isEditing
              ? tempTiers[profession] || 0
              : player.tiers[profession] || 0;
            const tierInfo = getTierInfo(tier);

            return (
              <div key={profession} className="flex items-center space-x-1">
                <span className="text-sm text-gray-700">{profession}:</span>
                {isEditing ? (
                  <select
                    value={tempTiers[profession] || 0}
                    onChange={(e) => updateTempTier(profession, e.target.value)}
                    className="w-16 px-1 py-1 text-sm border rounded text-center"
                  >
                    <option value={0}>-</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => (
                      <option key={t} value={t}>
                        T{t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className={`px-2 py-1 rounded text-sm font-medium ${tierInfo.color} w-10 text-center`}
                  >
                    {tier === 0 ? "-" : `T${tier}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TierLegend = () => (
    <div className="bg-white p-3 rounded-lg border shadow-sm mb-4">
      <div className="flex items-center justify-center gap-4">
        <h3 className="font-medium text-sm">Tier Legend</h3>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tier) => {
            const info = getTierInfo(tier);
            return (
              <span
                key={tier}
                className={`px-1.5 py-0.5 rounded text-xs ${info.color}`}
              >
                {info.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );

  const SyncStatus = () => {
    const statusInfo = getSyncStatusInfo();
    const IconComponent = statusInfo.icon;

    return (
      <div
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${statusInfo.color}`}
      >
        <IconComponent
          className={`w-4 h-4 ${statusInfo.spin ? "animate-spin" : ""}`}
        />
        <span>{statusInfo.text}</span>
        <span className="text-xs">•</span>
        <span className="text-xs">Updated {formatTime(lastUpdate)}</span>
      </div>
    );
  };

  const RecentChanges = () =>
    showChanges && (
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm border-l-4 border-blue-500">
        <h3 className="font-semibold mb-3 flex items-center">
          <RefreshCw className="w-4 h-4 mr-2" />
          Real-Time Activity Feed
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recentChanges.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent changes</p>
          ) : (
            recentChanges.slice(0, 20).map((change, index) => (
              <div
                key={index}
                className="flex items-start space-x-2 text-sm p-2 bg-gray-50 rounded"
              >
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatTime(change.timestamp)}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-blue-600">
                    {change.user}
                  </span>
                  <span className="ml-2">
                    {change.type === "player_added" &&
                      `added player "${change.details.playerName}"`}
                    {change.type === "player_deleted" &&
                      `deleted player "${change.details.playerName}"`}
                    {change.type === "status_changed" &&
                      `set ${change.details.playerName} ${change.details.status}`}
                    {change.type === "tiers_updated" && (
                      <>
                        updated {change.details.playerName}:
                        <div className="text-xs text-gray-600 mt-1">
                          {change.details.changes
                            .map(
                              (c) =>
                                `${c.profession}: T${c.oldTier}→T${c.newTier}`
                            )
                            .join(", ")}
                        </div>
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="mr-3" />
            Profession Tracker
          </h1>
          <div className="flex items-center space-x-4">
            <SyncStatus />
            <button
              onClick={() => setShowChanges(!showChanges)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${
                showChanges
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Activity</span>
            </button>
          </div>
        </div>

        <RecentChanges />

        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setCurrentView("master")}
              className={`px-4 py-2 rounded-md transition-colors ${
                currentView === "master"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Master List
            </button>
            {professions.map((prof) => (
              <button
                key={prof}
                onClick={() => {
                  setCurrentView("profession");
                  setSelectedProfession(prof);
                }}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === "profession" && selectedProfession === prof
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {prof}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                showOnlineOnly
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Online Only</span>
            </button>
          </div>
        </div>

        <TierLegend />

        {currentView === "master" && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded-md px-4 py-2 text-lg"
            />
          </div>
        )}

        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Enter new player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addNewPlayer()}
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              onClick={addNewPlayer}
              disabled={!isConnected || !newPlayerName.trim()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {currentView === "master"
                ? "All Players - All Skills"
                : `${selectedProfession} Rankings`}
              <span className="text-gray-500 font-normal ml-2">
                ({getFilteredPlayers().length}{" "}
                {showOnlineOnly ? "online" : "total"})
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {getFilteredPlayers().map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>

          {getFilteredPlayers().length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No players found</p>
              <p>Try adjusting your filters or add some players</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionTracker;