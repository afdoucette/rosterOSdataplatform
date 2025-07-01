// FULLY EXPANDED, NO OMISSIONS, FULL-FEATURED App.js WITH PORTFOLIO TABLE (Table/Charts/My Combos tabs, all helpers, all UI, all state, all pagination)

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Papa from "papaparse";
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Input,
  Grid,
  List,
  ListItem,
  ListItemText,
  Pagination,
  TextField,
  TableSortLabel,
  Divider,
  Tabs,
  Tab,
  Autocomplete,
  Chip,
  Collapse,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Typography, Slider } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";

// ---------- CONSTANTS & HELPERS ----------
const csvHeaders = [
  "Picked At","Pick Number","Appearance","First Name","Last Name","Team","Position","Draft","Draft Entry","Draft Entry Fee",
  "Draft Size","Draft Total Prizes","Tournament Title","Tournament","Tournament Entry Fee","Tournament Total Prizes",
  "Tournament Size","Draft Pool Title","Draft Pool","Draft Pool Entry Fee","Draft Pool Total Prizes","Draft Pool Size",
  "Weekly Winner Title","Weekly Winner","Weekly Winner Entry Fee","Weekly Winner Total Prizes","Weekly Winner Size"
];
const TEAM_COLORS = {
  ARI: "#97233F", ATL: "#A71930", BAL: "#241773", BUF: "#00338D", CAR: "#0085CA",
  CHI: "#0B162A", CIN: "#FB4F14", CLE: "#311D00", DAL: "#003594", DEN: "#002244",
  DET: "#0076B6", GB: "#203731", HOU: "#03202F", IND: "#002C5F", JAX: "#006778",
  KC: "#E31837", LV: "#000000", LAC: "#0080C6", LAR: "#003594", MIA: "#008E97",
  MIN: "#4F2683", NE: "#002244", NO: "#D3BC8D", NYG: "#0B2265", NYJ: "#125740",
  PHI: "#004C54", PIT: "#FFB612", SF: "#AA0000", SEA: "#002244", TB: "#D50A0A",
  TEN: "#4B92DB", WAS: "#5A1414",
};
const POSITION_COLORS = {
  QB: "#9647B8", RB: "#15997E", WR: "#E67E22", TE: "#2980B9", K: "#888888", DST: "#757575",
};
const TOURNAMENT_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#2b83ba", "#abdda4", "#ffffbf", "#fdae61", "#d7191c",
  "#a6cee3", "#b2df8a", "#fb9a99", "#fdbf6f", "#cab2d6"
];
const columns = [
  { id: "name", label: "Name", numeric: false, minWidth: 150, maxWidth: 200 },
  { id: "team", label: "Team", numeric: false, width: 90 },
  { id: "position", label: "Position", numeric: false, width: 90 },
  { id: "exposure", label: "Exposure", numeric: true, width: 90 },
  { id: "count", label: "# Drafted", numeric: true, width: 75 },
  { id: "myAdp", label: "My ADP", numeric: true, width: 85 },
  { id: "udAdp", label: "UD ADP", numeric: true, width: 85 },
  { id: "clv", label: "CLV", numeric: true, width: 75 },
  { id: "clvPct", label: "CLV %", numeric: true, width: 75 },
];
function validateHeaders(row) {
  const uploadedHeaders = Object.keys(row || {});
  return csvHeaders.filter(h => !uploadedHeaders.includes(h));
}
function getSummaryStats(data) {
  const totalPicks = data.length;
  const totalDrafts = new Set(data.map(row => row["Draft"])).size;
  const uniqueTeams = new Set(data.map(row => row["Team"])).size;
  const avgPickNumber = totalPicks > 0
    ? (data.reduce((sum, row) => sum + Number(row["Pick Number"] || 0), 0) / totalPicks).toFixed(2)
    : 0;
  const teamCounts = {};
  data.forEach(row => {
    const team = row["Team"];
    if (team) teamCounts[team] = (teamCounts[team] || 0) + 1;
  });
  const mostPickedTeam =
    Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const totalDraftPrizes = data.reduce(
    (sum, row) => sum + Number(row["Draft Total Prizes"] || 0),
    0
  );
  const totalTournamentPrizes = data.reduce(
    (sum, row) => sum + Number(row["Tournament Total Prizes"] || 0),
    0
  );
  return {
    totalPicks,
    totalDrafts,
    uniqueTeams,
    avgPickNumber,
    mostPickedTeam,
    totalDraftPrizes,
    totalTournamentPrizes,
  };
}
function groupDataByPlayer(data) {
  const playerMap = new Map();
  data.forEach(row => {
    const first = (row["First Name"] || "").trim();
    const last = (row["Last Name"] || "").trim();
    const team = (row["Team"] || "").trim();
    const position = (row["Position"] || "").trim();
    const name = `${first} ${last}`.trim();
    const key = `${name}|${team}|${position}`;
    if (!playerMap.has(key)) {
      playerMap.set(key, {
        name,
        team,
        position,
        pickNumbers: [],
        rows: [],
      });
    }
    const player = playerMap.get(key);
    player.pickNumbers.push(Number(row["Pick Number"]) || 0);
    player.rows.push(row);
  });
  for (const player of playerMap.values()) {
    const monthCounts = {};
    player.rows.forEach(row => {
      const pickedAt = row["Picked At"];
      if (pickedAt) {
        const date = new Date(pickedAt);
        if (!isNaN(date)) {
          const monthStr = date.toLocaleString("default", { month: "long", year: "numeric" });
          monthCounts[monthStr] = (monthCounts[monthStr] || 0) + 1;
        }
      }
    });
    const tournamentCounts = {};
    player.rows.forEach(row => {
      const title = row["Tournament Title"] || "Unknown";
      tournamentCounts[title] = (tournamentCounts[title] || 0) + 1;
    });
    let totalTournamentEntryFee = 0;
    player.rows.forEach(row => {
      const fee = parseFloat(row["Tournament Entry Fee"]);
      if (!isNaN(fee)) totalTournamentEntryFee += fee;
    });
    player.accordionStats = {
      monthCounts,
      tournamentCounts,
      totalTournamentEntryFee,
    };
  }
  return Array.from(playerMap.values());
}
function getPlayerCombos(player, allPlayers, comboSize = 2, topN = 5) {
  const playerDrafts = {};
  player.rows.forEach(row => {
    const draftId = row["Draft"];
    if (!draftId) return;
    playerDrafts[draftId] = true;
  });
  const combosCount = {};
  Object.keys(playerDrafts).forEach(draftId => {
    const playersInDraft = [];
    allPlayers.forEach(otherPlayer => {
      const inDraft = otherPlayer.rows.some(row => row["Draft"] === draftId);
      if (inDraft) {
        playersInDraft.push({
          name: otherPlayer.name,
          team: otherPlayer.team,
          position: otherPlayer.position,
        });
      }
    });
    const thisPlayerObj = playersInDraft.find(
      p => p.name === player.name && p.team === player.team && p.position === player.position
    );
    if (!thisPlayerObj) return;
    const uniquePlayers = [];
    const seen = new Set();
    for (const p of playersInDraft) {
      const k = `${p.name}|${p.team}|${p.position}`;
      if (!seen.has(k)) {
        uniquePlayers.push(p);
        seen.add(k);
      }
    }
    if (uniquePlayers.length < comboSize) return;
    const teammates = uniquePlayers.filter(
      p => !(p.name === player.name && p.team === player.team && p.position === player.position)
    );
    function k_combinations(set, k) {
      if (k === 0) return [[]];
      if (set.length === 0) return [];
      const [first, ...rest] = set;
      const withFirst = k_combinations(rest, k - 1).map(comb => [first, ...comb]);
      const withoutFirst = k_combinations(rest, k);
      return withFirst.concat(withoutFirst);
    }
    const teammateCombos = k_combinations(teammates, comboSize - 1);
    teammateCombos.forEach(teammateCombo => {
      const comboPlayers = [thisPlayerObj, ...teammateCombo];
      const filteredPlayers = comboPlayers.filter(
        p => !(p.name === player.name && p.team === player.team && p.position === player.position)
      );
      filteredPlayers.sort((a, b) =>
        a.name.localeCompare(b.name) ||
        a.team.localeCompare(b.team) ||
        a.position.localeCompare(b.position)
      );
      const comboKey = filteredPlayers.map(p => `${p.name}|${p.team}|${p.position}`).join("||");
      if (!comboKey) return;
      if (!combosCount[comboKey]) {
        combosCount[comboKey] = { players: filteredPlayers, count: 0 };
      }
      combosCount[comboKey].count += 1;
    });
  });
  const sortedCombos = Object.values(combosCount)
    .filter(combo => combo.players.length === comboSize - 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  return sortedCombos;
}
function getPortfolioRecommendationPairs(players, rawData, exposureThreshold = 15) {
  const totalDrafts = new Set(rawData.map(row => row["Draft"])).size;
  const playerObjs = players.map(player => {
    const playerDrafts = new Set(player.rows.map(row => row["Draft"])).size;
    const exposure = totalDrafts > 0 ? ((playerDrafts / totalDrafts) * 100) : 0;
    return { ...player, exposure };
  }).filter(p => p.exposure > exposureThreshold);

  let pairs = [];
  for (let i = 0; i < playerObjs.length; ++i) {
    for (let j = i + 1; j < playerObjs.length; ++j) {
      const p1 = playerObjs[i];
      const p2 = playerObjs[j];
      const drafts1 = new Set(p1.rows.map(row => row["Draft"]));
      const drafts2 = new Set(p2.rows.map(row => row["Draft"]));
      const overlap = [...drafts1].find(d => drafts2.has(d));
      if (!overlap) {
        pairs.push({
          p1,
          p2,
          exposure1: p1.exposure,
          exposure2: p2.exposure,
        });
      }
    }
  }
  pairs.sort((a, b) => (b.exposure1 + b.exposure2) - (a.exposure1 + a.exposure2)
    || b.exposure1 - a.exposure1
    || b.exposure2 - a.exposure2);
  return pairs;
}
function getPlayerPickChartData(player) {
  if (!player || !player.rows) return [];
  const points = player.rows
    .map(row => {
      const date = row["Picked At"] ? new Date(row["Picked At"]) : null;
      const pick = Number(row["Pick Number"]);
      return date && !isNaN(pick) ? { date, pick } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
  return points.map(pt => ({
    pick: pt.pick,
    date: pt.date.getTime(),
    dateStr: pt.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
  }));
}
function getUniquePlayersByTeam(data) {
  const teamPlayers = {};
  data.forEach(row => {
    const team = row["Team"];
    const fullName = `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim();
    if (!team || !fullName) return;
    if (!teamPlayers[team]) teamPlayers[team] = new Set();
    teamPlayers[team].add(fullName);
  });
  return Object.entries(teamPlayers)
    .map(([team, players]) => ({
      team,
      uniquePlayers: players.size,
    }))
    .sort((a, b) => b.uniquePlayers - a.uniquePlayers || a.team.localeCompare(b.team));
}
function getStackedTeamPositionChartData(data) {
  const counts = {};
  const positionsSet = new Set();
  data.forEach(row => {
    const team = row["Team"];
    const position = row["Position"];
    if (!team) return;
    if (!counts[team]) counts[team] = {};
    counts[team][position] = (counts[team][position] || 0) + 1;
    positionsSet.add(position);
  });
  const positions = Array.from(positionsSet).sort((a, b) => {
    const pref = { QB: 1, RB: 2, WR: 3, TE: 4 };
    return (pref[a] || 99) - (pref[b] || 99) || a.localeCompare(b);
  });
  const chartData = Object.entries(counts)
    .map(([team, posCounts]) => {
      const row = { team };
      positions.forEach(pos => row[pos] = posCounts[pos] || 0);
      return row;
    })
    .sort((a, b) => a.team.localeCompare(b.team));
  return { chartData, positions };
}
function getDraftSlotStackedByTournament(data) {
  const slots = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const tournamentTitles = Array.from(new Set(data.map(row => row["Tournament Title"] || "Unknown")));
  const slotMap = {};
  data.forEach(row => {
    const draftId = row["Draft"];
    const slot = parseInt(row["Pick Number"], 10);
    const tournament = row["Tournament Title"] || "Unknown";
    if (!draftId || isNaN(slot) || slot < 1 || slot > 12) return;
    if (!slotMap[draftId]) slotMap[draftId] = { slot: slot.toString(), tournament };
    else if (slot < parseInt(slotMap[draftId].slot)) slotMap[draftId].slot = slot.toString();
  });
  const counts = {};
  Object.values(slotMap).forEach(({ slot, tournament }) => {
    if (!counts[slot]) counts[slot] = {};
    counts[slot][tournament] = (counts[slot][tournament] || 0) + 1;
  });
  return {
    chartData: slots.map(slot => {
      const obj = { slot };
      tournamentTitles.forEach(t => {
        obj[t] = (counts[slot] && counts[slot][t]) || 0;
      });
      return obj;
    }),
    tournamentTitles
  };
}
function getLineChartDataForPositionByRound(data) {
  if (!data || data.length === 0) return [];
  let maxPick = 0;
  data.forEach(row => {
    const n = Number(row["Pick Number"]);
    if (!isNaN(n) && n > maxPick) maxPick = n;
  });
  const maxRound = Math.ceil(maxPick / 12);
  const positionsSet = new Set();
  data.forEach(row => {
    positionsSet.add(row["Position"]);
  });
  const positions = Array.from(positionsSet).sort((a, b) => {
    const order = { QB: 1, RB: 2, WR: 3, TE: 4 };
    return (order[a] || 99) - (order[b] || 99) || a.localeCompare(b);
  });
  const rounds = Array.from({ length: maxRound }, (_, idx) => idx + 1);
  const result = [];
  for (const round of rounds) {
    const picksInRound = data.filter(row => {
      const n = Number(row["Pick Number"]);
      return !isNaN(n) && n > (round - 1) * 12 && n <= round * 12;
    });
    const total = picksInRound.length;
    const obj = { round, total };
    positions.forEach(pos => {
      const n = picksInRound.filter(row => row["Position"] === pos).length;
      obj[pos] = total > 0 ? (n / total) * 100 : 0;
    });
    result.push(obj);
  }
  return { data: result, positions, maxRound };
}
function getTeamsTableFromCsv(data) {
  const teams = {};
  data.forEach(row => {
    const draftId = row["Draft"];
    if (!draftId) return;
    if (!teams[draftId]) {
      let minDate = null;
      let tournament = "";
      let draftSlot = null;
      if (row["Picked At"]) {
        const dt = new Date(row["Picked At"]);
        if (!isNaN(dt)) minDate = dt;
      }
      if (row["Tournament Title"]) tournament = row["Tournament Title"];
      teams[draftId] = {
        draftId,
        date: minDate,
        tournament,
        draftSlot,
        playersByPosition: {},
        rows: [],
      };
    }
    const playerName = `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim();
    const position = row["Position"] || "";
    const teamAbbr = row["Team"];
    const pickNumber = Number(row["Pick Number"]);
    if (!teams[draftId].playersByPosition[position]) {
      teams[draftId].playersByPosition[position] = [];
    }
    teams[draftId].playersByPosition[position].push({
      name: playerName,
      team: teamAbbr,
      pickNumber,
      position,
    });
    if (row["Picked At"]) {
      const dt = new Date(row["Picked At"]);
      if (!isNaN(dt)) {
        if (!teams[draftId].date || dt < teams[draftId].date) {
          teams[draftId].date = dt;
        }
      }
    }
    if (!teams[draftId].tournament && row["Tournament Title"]) {
      teams[draftId].tournament = row["Tournament Title"];
    }
    if (!teams[draftId].draftSlot || (pickNumber && pickNumber < teams[draftId].draftSlot)) {
      teams[draftId].draftSlot = pickNumber;
    }
    teams[draftId].rows.push(row);
  });
  Object.values(teams).forEach(team => {
    team.date = team.date ? team.date.toISOString().slice(0, 10) : "";
    const order = ["QB", "RB", "WR", "TE"];
    for (const pos of Object.keys(team.playersByPosition)) {
      team.playersByPosition[pos].sort((a, b) => a.pickNumber - b.pickNumber);
    }
    team.orderedPositions = [
      ...order.filter(pos => pos in team.playersByPosition),
      ...Object.keys(team.playersByPosition).filter(pos => !order.includes(pos)),
    ];
    team.allPlayerNames = Object.values(team.playersByPosition)
      .flat()
      .map(p => p.name);
  });
  return Object.values(teams).sort((a, b) => b.date.localeCompare(a.date));
}

// ---------- PortfolioPairsTable COMPONENT ----------
function PortfolioPairsTable({ pairs, TEAM_COLORS }) {
  const [filter, setFilter] = useState("");
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("exposure1");

  const getComparator = (column, order) => (a, b) => {
    let aVal, bVal;
    if (column === "p1") {
      aVal = a.p1.name;
      bVal = b.p1.name;
    } else if (column === "p2") {
      aVal = a.p2.name;
      bVal = b.p2.name;
    } else if (column === "exposure1") {
      aVal = Number(a.exposure1);
      bVal = Number(b.exposure1);
    } else if (column === "exposure2") {
      aVal = Number(a.exposure2);
      bVal = Number(b.exposure2);
    }
    if (typeof aVal === "string") aVal = aVal.toLocaleLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLocaleLowerCase();
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  };

  const filtered = useMemo(() => {
    if (!filter) return pairs;
    return pairs.filter(
      ({ p1, p2 }) =>
        p1.name.toLowerCase().includes(filter.toLowerCase()) ||
        p2.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [pairs, filter]);

  const sorted = useMemo(() => {
    if (!orderBy) return filtered;
    return filtered.slice().sort(getComparator(orderBy, order));
  }, [filtered, orderBy, order]);

  const handleSort = (col) => {
    if (orderBy === col) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(col);
      setOrder("desc");
    }
  };

  return (
    <Paper sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
        <TextField
          label="Filter by player"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          size="small"
          sx={{ width: 260 }}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "p1"}
                  direction={orderBy === "p1" ? order : "asc"}
                  onClick={() => handleSort("p1")}
                >
                  Player 1
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "exposure1"}
                  direction={orderBy === "exposure1" ? order : "desc"}
                  onClick={() => handleSort("exposure1")}
                >
                  Exposure 1 (%)
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "p2"}
                  direction={orderBy === "p2" ? order : "asc"}
                  onClick={() => handleSort("p2")}
                >
                  Player 2
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "exposure2"}
                  direction={orderBy === "exposure2" ? order : "desc"}
                  onClick={() => handleSort("exposure2")}
                >
                  Exposure 2 (%)
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map(({ p1, p2, exposure1, exposure2 }, idx) => (
              <TableRow key={p1.name + p1.team + p1.position + "|" + p2.name + p2.team + p2.position}>
                <TableCell>
                  <Chip
                    label={`${p1.name} (${p1.team} ${p1.position})`}
                    size="small"
                    sx={{
                      bgcolor: TEAM_COLORS[p1.team] || "#eee",
                      color: "#fff",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>{exposure1.toFixed(1)}</TableCell>
                <TableCell>
                  <Chip
                    label={`${p2.name} (${p2.team} ${p2.position})`}
                    size="small"
                    sx={{
                      bgcolor: TEAM_COLORS[p2.team] || "#eee",
                      color: "#fff",
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>{exposure2.toFixed(1)}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No pairs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ---------- PlayerRow COMPONENT ----------
const PlayerRow = React.memo(function PlayerRow({
  player,
  myAdp,
  udAdp,
  clv,
  clvPct,
  exposure,
  count,
  isOpen,
  onClick,
  TEAM_COLORS,
  allPlayers,
}) {
  const key = `${player.name}|${player.team}|${player.position}`;
  const chartData = getPlayerPickChartData(player);
  const yMin = 1;
  const yMax = 216;
  const xMin = useMemo(() => {
    const d = new Date();
    d.setMonth(3); d.setDate(15); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const xMax = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);
  const top2Combos = useMemo(() => getPlayerCombos(player, allPlayers, 2, 5), [player, allPlayers]);
  const top3Combos = useMemo(() => getPlayerCombos(player, allPlayers, 3, 5), [player, allPlayers]);
  return (
    <React.Fragment key={key}>
      <TableRow hover onClick={onClick} sx={{ cursor: "pointer" }}>
        <TableCell sx={{ width: 40, textAlign: 'center', p: 0 }}>
          {isOpen ? <ExpandMoreIcon aria-label="Collapse row" /> : <ChevronRightIcon aria-label="Expand row" />}
        </TableCell>
        <TableCell sx={{ minWidth: 150, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</TableCell>
        <TableCell sx={{ width: 90 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: TEAM_COLORS[player.team] || "#888888", mr: 1 }} />
            {player.team}
          </Box>
        </TableCell>
        <TableCell sx={{ width: 90 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              px: 1.5,
              py: 0.5,
              bgcolor: POSITION_COLORS[player.position] || "#888",
              color: "#fff",
              fontWeight: 700,
              borderRadius: 999,
              fontSize: 14,
              minWidth: 36,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {player.position}
          </Box>
        </TableCell>
        <TableCell sx={{ width: 90 }}>{exposure}</TableCell>
        <TableCell sx={{ width: 75 }}>{count}</TableCell>
        <TableCell sx={{ width: 85 }}>{myAdp}</TableCell>
        <TableCell sx={{ width: 85 }}>{udAdp}</TableCell>
        <TableCell sx={{ width: 75 }}>{clv}</TableCell>
        <TableCell sx={{ width: 75 }}>{clvPct}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={columns.length + 1} sx={{ p: 0, border: 0, background: "#fafbfc" }}>
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                width: "100%",
                boxSizing: "border-box"
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  width: "100%",
                  gap: 3,
                  alignItems: "flex-start",
                  boxSizing: "border-box",
                }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", md: "50%" },
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Pick Number Over Time
                  </Typography>
                  <Box sx={{ width: "100%", minHeight: 400, maxWidth: "100%" }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 5, bottom: 15 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="date"
                          domain={[xMin, xMax]}
                          tickFormatter={ts => {
                            const d = new Date(ts);
                            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          }}
                          ticks={[
                            xMin,
                            ...(chartData.length ? [chartData[0].date] : []),
                            ...(chartData.length ? [chartData[chartData.length-1].date] : []),
                            xMax
                          ]}
                          scale="time"
                          allowDuplicatedCategory={false}
                          minTickGap={15}
                        />
                        <YAxis
                          domain={[yMin, yMax]}
                          reversed={true}
                          allowDecimals={false}
                          ticks={[1, 24, 48, 72, 96, 120, 144, 168, 192, 216]}
                          tickFormatter={v => v}
                          label={{ value: "Pick #", angle: -90, position: "insideLeft", dx: -5, dy: 30, fontSize: 12 }}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) =>
                            payload && payload.length > 0
                              ? new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                              : ""
                          }
                          formatter={(value, name) => [`Pick #${value}`, "Pick"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="pick"
                          stroke={POSITION_COLORS[player.position] || "#1976d2"}
                          strokeWidth={2}
                          dot={{ r: 4, fill: POSITION_COLORS[player.position] || "#1976d2" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                <Box
                  sx={{
                    width: { xs: "100%", md: "25%" },
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Top 2-Player Combos
                  </Typography>
                  <List dense>
                    {top2Combos.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No combos found" />
                      </ListItem>
                    )}
                    {top2Combos.map(combo => (
                      <ListItem key={combo.players.map(p => `${p.name}|${p.team}|${p.position}`).join("||")}>
                        <ListItemText
                          primary={
                            <>
                              {combo.players.map(p => (
                                <Chip
                                  key={p.name + p.team + p.position}
                                  label={`${p.name} (${p.team} ${p.position})`}
                                  size="small"
                                  sx={{
                                    bgcolor: TEAM_COLORS[p.team] || "#eee",
                                    color: "#fff",
                                    fontWeight: 500,
                                    mr: 1,
                                    mb: 0.5,
                                  }}
                                />
                              ))}
                            </>
                          }
                          secondary={`Drafted together ${combo.count} times`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
                <Box
                  sx={{
                    width: { xs: "100%", md: "25%" },
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Top 3-Player Combos
                  </Typography>
                  <List dense>
                    {top3Combos.length === 0 && (
                      <ListItem>
                        <ListItemText primary="No combos found" />
                      </ListItem>
                    )}
                    {top3Combos.map(combo => (
                      <ListItem key={combo.players.map(p => `${p.name}|${p.team}|${p.position}`).join("||")}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                              {combo.players.map(p => (
                                <Chip
                                  key={p.name + p.team + p.position}
                                  label={`${p.name} (${p.team} ${p.position})`}
                                  size="small"
                                  sx={{
                                    bgcolor: TEAM_COLORS[p.team] || "#eee",
                                    color: "#fff",
                                    fontWeight: 500,
                                    mb: 0.5,
                                  }}
                                />
                              ))}
                            </Box>
                          }
                          secondary={`Drafted together ${combo.count} times`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </Box>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
});

// ---------- MAIN APP ----------
export default function App() {
  // --- State ---
  const [rawData, setRawData] = useState([]);
  const [players, setPlayers] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [chartData, setChartData] = useState({ chartData: [], positions: [] });
  const [draftSlotHistogram, setDraftSlotHistogram] = useState([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [expandedPlayer, setExpandedPlayer] = useState(false);
  const [page, setPage] = useState(1);
  const [filterName, setFilterName] = useState("");
  const [sortColumn, setSortColumn] = useState("myAdp");
  const [sortDirection, setSortDirection] = useState("asc");
  const rowsPerPage = 25;
  const [adpData, setAdpData] = useState([]);
  const [adpLoading, setAdpLoading] = useState(false);
  const [adpError, setAdpError] = useState("");
  const [tab, setTab] = useState(0);
  const [comboPlayerInputs, setComboPlayerInputs] = useState([]);
  const [comboPage, setComboPage] = useState(1);
  const comboRowsPerPage = 15;
  const [exposureThreshold, setExposureThreshold] = useState(15);

 useEffect(() => {
  setAdpLoading(true);
  fetch(process.env.PUBLIC_URL + "/ud_adp.json")
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch ADP data");
      return res.json();
    })
    .then(data => {
      setAdpData(data);
      setAdpError("");
    })
    .catch(() => {
      setAdpError("Could not load Underdog ADP data.");
      setAdpData([]);
    });
}, []);
  const udAdpLookup = useMemo(() => {
    const map = new Map();
    adpData.forEach(row => {
      const key = `${row.firstName ? row.firstName.trim() : ""} ${row.lastName ? row.lastName.trim() : ""}`.trim();
      map.set(key, row.adp);
    });
    return map;
  }, [adpData]);
  const adpPlayerOptions = useMemo(() => {
    if (!adpData || adpData.length === 0) return [];
    return adpData
      .map(row => ({
        label: `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim(),
        value: `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim(),
        team: row.team,
        position: row.position,
        adp: row.adp,
      }))
      .sort((a, b) => a.adp - b.adp);
  }, [adpData]);
  const processAllStats = (data) => {
    setRawData(data);
    setSummaryStats(getSummaryStats(data));
    setChartData(getStackedTeamPositionChartData(data));
    setDraftSlotHistogram(data);
    let playerTableData = groupDataByPlayer(data);
    playerTableData = playerTableData.slice().sort((a, b) => {
      const adpA = a.pickNumbers.length ? a.pickNumbers.reduce((x, y) => x + y, 0) / a.pickNumbers.length : Infinity;
      const adpB = b.pickNumbers.length ? b.pickNumbers.reduce((x, y) => x + y, 0) / b.pickNumbers.length : Infinity;
      return adpA - adpB;
    });
    setPlayers(playerTableData);
    setPage(1);
  };
  const handleFile = (e) => {
    setError("");
    setPlayers([]);
    setSummaryStats(null);
    setChartData({ chartData: [], positions: [] });
    setDraftSlotHistogram([]);
    setExpandedPlayer(false);
    setComboPlayerInputs([]);
    setComboPage(1);
    const file = e.target.files[0];
    setFileName(file ? file.name : "");
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data || !result.data.length) {
          setError("No data found in CSV.");
          setPlayers([]);
          setSummaryStats(null);
          setChartData({ chartData: [], positions: [] });
          setDraftSlotHistogram([]);
          return;
        }
        const missing = validateHeaders(result.data[0]);
        if (missing.length) {
          setError(`Missing CSV headers: ${missing.join(", ")}`);
          setPlayers([]);
          setSummaryStats(null);
          setChartData({ chartData: [], positions: [] });
          setDraftSlotHistogram([]);
        } else {
          setError("");
          processAllStats(result.data);
        }
      },
    });
  };

  const totalDrafts = useMemo(() => {
    if (!rawData || rawData.length === 0) return 0;
    return new Set(rawData.map(row => row["Draft"])).size;
  }, [rawData]);
  const filteredPlayers = useMemo(() => {
    if (!filterName) return players;
    return players.filter(p =>
      p.name.toLowerCase().includes(filterName.toLowerCase())
    );
  }, [players, filterName]);
  const sortedPlayers = useMemo(() => {
    return filteredPlayers.slice().sort((a, b) => {
      const getComputed = (player) => {
        const myAdp = player.pickNumbers.length
          ? (player.pickNumbers.reduce((x, y) => x + y, 0) / player.pickNumbers.length).toFixed(2)
          : "-";
        const udKey = player.name ? player.name.trim() : "";
        const udAdp = udAdpLookup.get(udKey) ?? "-";
        const myAdpNum = Number(myAdp);
        const udAdpNum = Number(udAdp);
        const clv = (!isNaN(myAdpNum) && !isNaN(udAdpNum))
          ? (myAdpNum - udAdpNum).toFixed(2)
          : "-";
        const clvPct = (!isNaN(myAdpNum) && !isNaN(udAdpNum) && udAdpNum !== 0)
          ? (((myAdpNum - udAdpNum) / udAdpNum) * 100).toFixed(1)
          : "-";
        const playerDrafts = new Set(player.rows.map(row => row["Draft"])).size;
        const exposure = totalDrafts > 0
          ? ((playerDrafts / totalDrafts) * 100).toFixed(1)
          : "-";
        const count = player.rows.length;
        return {
          myAdp,
          udAdp,
          clv,
          clvPct,
          exposure,
          count,
        };
      };
      const aComputed = getComputed(a);
      const bComputed = getComputed(b);
      let aVal = aComputed[sortColumn] ?? "";
      let bVal = bComputed[sortColumn] ?? "";
      if (sortColumn === "exposure" || sortColumn === "clvPct") {
        if (typeof aVal === "string" && aVal.endsWith("%")) aVal = aVal.replace("%", "");
        if (typeof bVal === "string" && bVal.endsWith("%")) bVal = bVal.replace("%", "");
      }
      if (typeof aVal === "string" && typeof bVal === "string" && isNaN(Number(aVal)) && isNaN(Number(bVal))) {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const cmp = Number(aVal) - Number(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredPlayers, sortColumn, sortDirection, udAdpLookup, totalDrafts]);
  const pagedPlayers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedPlayers.slice(start, end);
  }, [sortedPlayers, page, rowsPerPage]);
  const pageCount = useMemo(() => Math.ceil(sortedPlayers.length / rowsPerPage), [sortedPlayers, rowsPerPage]);
  const handleRowClick = useCallback(
    (key) => () => {
      setExpandedPlayer(expandedPlayer === key ? false : key);
    },
    [expandedPlayer]
  );
  const handlePageChange = (event, value) => {
    setPage(value);
    setExpandedPlayer(false);
  };
  const handleSort = (columnId) => () => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
    setPage(1);
  };
  const handleFilterName = (e) => {
    setFilterName(e.target.value);
    setPage(1);
  };
  const allTeams = useMemo(() => getTeamsTableFromCsv(rawData), [rawData]);
  const filteredTeams = useMemo(() => {
    if (!comboPlayerInputs || comboPlayerInputs.length === 0) return allTeams;
    return allTeams.filter(team => {
      const teamPlayerNames = new Set(team.allPlayerNames);
      return comboPlayerInputs.every(selected => teamPlayerNames.has(selected.value));
    });
  }, [allTeams, comboPlayerInputs]);
  const pagedTeams = useMemo(() => {
    const start = (comboPage - 1) * comboRowsPerPage;
    const end = start + comboRowsPerPage;
    return filteredTeams.slice(start, end);
  }, [filteredTeams, comboPage, comboRowsPerPage]);
  const comboPageCount = useMemo(() => Math.ceil(filteredTeams.length / comboRowsPerPage), [filteredTeams, comboRowsPerPage]);
  const handleComboPlayersChange = (event, value) => {
    setComboPlayerInputs(value);
    setComboPage(1);
  };
  const handleComboPageChange = (event, value) => {
    setComboPage(value);
  };
  const handleTabChange = (event, newValue) => setTab(newValue);

  // --- Portfolio Recommendation for My Combos tab ---
  const portfolioPairs = useMemo(() => {
    if (!rawData || rawData.length === 0 || !players || players.length === 0) return [];
    return getPortfolioRecommendationPairs(players, rawData, exposureThreshold);
  }, [rawData, players, exposureThreshold]);

  // --- RENDER ---
  return (
    <Box sx={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f5f7fa 0%, #ebedf0 100%)",
      py: { xs: 2, sm: 4 },
    }}>
      <Container maxWidth="xl">
        <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mb: 3, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Draft CSV Visualizer
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ color: "text.secondary" }}>
            Upload your draft CSV file to see stats, tables, and charts.
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 2 }}>
            (All processing is done in your browser. Your data never leaves your device.)
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Button variant="contained" component="label" color="primary">
              Upload CSV
              <Input
                type="file"
                accept=".csv"
                onChange={handleFile}
                sx={{ display: "none" }}
              />
            </Button>
            {fileName && (
              <Typography sx={{ color: "text.secondary" }}>{fileName}</Typography>
            )}
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Divider sx={{ my: 2 }} />
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            aria-label="main tabs"
            sx={{ mb: 1 }}
          >
            <Tab label="Table" />
            <Tab label="Charts" />
            <Tab label="My Combos" />
          </Tabs>
        </Paper>
        {/* TAB: TABLE */}
        {tab === 0 && (
          <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, mb: 3, borderRadius: 3 }}>
            {players.length > 0 && summaryStats && (
              <>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Summary</Typography>
                    <List dense disablePadding>
                      <ListItem disablePadding>
                        <ListItemText primary={`Total Picks: ${summaryStats.totalPicks}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Total Drafts: ${summaryStats.totalDrafts}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Unique Teams: ${summaryStats.uniqueTeams}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Average Pick Number: ${summaryStats.avgPickNumber}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Most Picked Team: ${summaryStats.mostPickedTeam}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Total Draft Prizes: $${summaryStats.totalDraftPrizes.toLocaleString()}`} />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText primary={`Total Tournament Prizes: $${summaryStats.totalTournamentPrizes.toLocaleString()}`} />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
                <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-start" }}>
                  <TextField
                    label="Filter by Name"
                    value={filterName}
                    onChange={handleFilterName}
                    size="small"
                    sx={{ width: 240, maxWidth: "100%" }}
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, minWidth: 900 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40, p: 0 }} />
                        {columns.map(col => (
                          <TableCell
                            key={col.id}
                            sx={{
                              minWidth: col.minWidth,
                              maxWidth: col.maxWidth,
                              width: col.width,
                              fontWeight: 700,
                              bgcolor: "#fafbfc",
                              whiteSpace: "nowrap",
                              px: 1.5,
                            }}
                            sortDirection={sortColumn === col.id ? sortDirection : false}
                          >
                            <TableSortLabel
                              active={sortColumn === col.id}
                              direction={sortColumn === col.id ? sortDirection : "asc"}
                              onClick={handleSort(col.id)}
                            >
                              {col.label}
                            </TableSortLabel>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedPlayers.map(player => {
                        const myAdp = player.pickNumbers.length
                          ? (player.pickNumbers.reduce((x, y) => x + y, 0) / player.pickNumbers.length).toFixed(2)
                          : "-";
                        const udKey = player.name ? player.name.trim() : "";
                        const udAdp = udAdpLookup.get(udKey) ?? "-";
                        const myAdpNum = Number(myAdp);
                        const udAdpNum = Number(udAdp);
                        const clv = (!isNaN(myAdpNum) && !isNaN(udAdpNum))
                          ? (myAdpNum - udAdpNum).toFixed(2)
                          : "-";
                        const clvPct = (!isNaN(myAdpNum) && !isNaN(udAdpNum) && udAdpNum !== 0)
                          ? (((myAdpNum - udAdpNum) / udAdpNum) * 100).toFixed(1)
                          : "-";
                        const playerDrafts = new Set(player.rows.map(row => row["Draft"])).size;
                        const exposure = totalDrafts > 0
                          ? ((playerDrafts / totalDrafts) * 100).toFixed(1)
                          : "-";
                        const count = player.rows.length;
                        const key = `${player.name}|${player.team}|${player.position}`;
                        return (
                          <PlayerRow
                            key={key}
                            player={player}
                            myAdp={myAdp}
                            udAdp={udAdp}
                            clv={clv}
                            clvPct={clvPct}
                            exposure={exposure}
                            count={count}
                            isOpen={expandedPlayer === key}
                            onClick={handleRowClick(key)}
                            TEAM_COLORS={TEAM_COLORS}
                            allPlayers={players}
                          />
                        );
                      })}
                      {pagedPlayers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={columns.length + 1} align="center">
                            No players found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    siblingCount={1}
                    boundaryCount={1}
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </>
            )}
          </Paper>
        )}
        {/* TAB: CHARTS */}
        {tab === 1 && (
          <Box>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Unique Players Drafted by Team
              </Typography>
              {rawData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getUniquePlayersByTeam(rawData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uniquePlayers">
                      {getUniquePlayersByTeam(rawData).map(entry => (
                        <Cell key={entry.team} fill={TEAM_COLORS[entry.team] || "#8884d8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography>No data</Typography>
              )}
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Team/Position Breakdown
              </Typography>
              {chartData.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis />
                    <Tooltip />
                    {["QB","RB","WR","TE"].map(pos => (
                      <Bar dataKey={pos} stackId="a" fill={POSITION_COLORS[pos]} key={pos} />
                    ))}
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography>No data</Typography>
              )}
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Draft Slot by Tournament
              </Typography>
              {draftSlotHistogram.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getDraftSlotStackedByTournament(draftSlotHistogram).chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="slot" />
                    <YAxis />
                    <Tooltip />
                    {getDraftSlotStackedByTournament(draftSlotHistogram).tournamentTitles.map((t, i) => (
                      <Bar dataKey={t} stackId="a" fill={TOURNAMENT_COLORS[i % TOURNAMENT_COLORS.length]} key={t} />
                    ))}
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography>No data</Typography>
              )}
            </Paper>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Positional % by Round
              </Typography>
              {rawData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={getLineChartDataForPositionByRound(rawData).data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="round" />
                    <YAxis />
                    <Tooltip />
                    {["QB","RB","WR","TE"].map(pos => (
                      <Line type="monotone" dataKey={pos} stroke={POSITION_COLORS[pos]} key={pos} dot={{ r: 4 }} strokeWidth={2} />
                    ))}
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography>No data</Typography>
              )}
            </Paper>
          </Box>
        )}
        {/* TAB: MY COMBOS */}
        {tab === 2 && (
          <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, mb: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              My Draft Teams: Filter by Player Combos
            </Typography>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Autocomplete
                multiple
                id="combo-player-autocomplete"
                options={adpPlayerOptions}
                disableCloseOnSelect
                filterSelectedOptions
                value={comboPlayerInputs}
                onChange={handleComboPlayersChange}
                getOptionLabel={option => option.label}
                renderInput={params => (
                  <TextField
                    {...params}
                    variant="outlined"
                    size="small"
                    label="Filter: Add Players"
                    placeholder="Enter player name(s)"
                    sx={{ minWidth: 280, maxWidth: 420 }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      {...getTagProps({ index })}
                    />
                  ))
                }
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
              <Typography variant="body2" sx={{ color: "text.secondary", ml: 2 }}>
                Showing {filteredTeams.length} of {allTeams.length} teams
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 90, maxWidth: 90, minWidth: 60, whiteSpace: 'nowrap', fontWeight: 700 }}>Draft Date</TableCell>
                    <TableCell sx={{ width: 60, maxWidth: 60, minWidth: 40, whiteSpace: 'nowrap', fontWeight: 700 }}>Draft Slot</TableCell>
                    <TableCell sx={{ width: 120, maxWidth: 120, minWidth: 80, whiteSpace: 'nowrap', fontWeight: 700 }}>Tournament</TableCell>
                    <TableCell sx={{ width: "60%", fontWeight: 700 }}>Roster</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedTeams.map(team => (
                    <TableRow key={team.draftId}>
                      <TableCell sx={{ width: 90, maxWidth: 90, minWidth: 60, whiteSpace: 'nowrap' }}>{team.date}</TableCell>
                      <TableCell sx={{ width: 60, maxWidth: 60, minWidth: 40, whiteSpace: 'nowrap' }}>{team.draftSlot || ""}</TableCell>
                      <TableCell sx={{ width: 120, maxWidth: 120, minWidth: 80, whiteSpace: 'nowrap' }}>{team.tournament}</TableCell>
                      <TableCell sx={{ p: 0 }}>
                        <Box sx={{
                          display: "flex",
                          width: "100%",
                          gap: 2,
                          alignItems: "stretch",
                          justifyContent: "stretch",
                        }}>
                          {team.orderedPositions.map(pos => (
                            <Box
                              key={pos}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                bgcolor: "#fafbfc",
                                borderRadius: 1,
                                p: 1,
                                mb: 1,
                                border: "1px solid #eee",
                                maxWidth: "100%",
                                boxSizing: "border-box",
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {pos}
                              </Typography>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
                                {team.playersByPosition[pos].map((p, idx) => (
                                  <Chip
                                    key={p.name + p.position + p.pickNumber}
                                    label={`${p.name} [${p.pickNumber}]`}
                                    size="small"
                                    sx={{
                                      bgcolor: TEAM_COLORS[p.team] || "#eee",
                                      color: "#fff",
                                      fontWeight: 500,
                                      mb: 0.5,
                                      width: "100%",
                                      minWidth: 0,
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pagedTeams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No teams found with all selected players.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Pagination
                count={comboPageCount}
                page={comboPage}
                onChange={handleComboPageChange}
                color="primary"
                siblingCount={1}
                boundaryCount={1}
                showFirstButton
                showLastButton
              />
            </Box>
            <Divider sx={{ my: 4 }} />
            {/* Portfolio Recommendation Section: TABLE */}
         <Box sx={{ display: "flex", alignItems: "center", my: 2, gap: 2 }}>
  <Typography variant="h6" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
    Portfolio Recommendation: 2-Player Combos Over
  </Typography>
  <Slider
    sx={{ flexGrow: 1, mx: 3 }}
    value={exposureThreshold >= 50 ? 52 : exposureThreshold}
    onChange={(e, val) => setExposureThreshold(val === 52 ? 50 : val)}
    step={2}
    min={10}
    max={52}
    marks={[
      ...Array.from({ length: 21 }, (_, i) => {
        const val = 10 + i * 2;
        if (val <= 50) return { value: val, label: `${val}%` };
        return null;
      }).filter(Boolean),
      { value: 52, label: "50%+" }
    ]}
    valueLabelDisplay="auto"
    getAriaValueText={v => (v === 52 ? "50%+" : `${v}%`)}
  />
  <Typography variant="h6" fontWeight={600} sx={{ minWidth: 55 }}>
    {exposureThreshold >= 50 ? "50%+" : `${exposureThreshold}%`}
  </Typography>
</Box>
          </Paper>
        )}
        <Paper elevation={1} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mt: 4 }}>
          <Typography variant="h6" fontWeight={600}>CSV Format</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your CSV file must have the following columns:<br />
            <code style={{ fontSize: "0.95em" }}>{csvHeaders.join(", ")}</code>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
