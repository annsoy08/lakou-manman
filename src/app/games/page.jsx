"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { clearChessPresence, commitChessGameMove, createChessGameSession, createChessInviteNotification, getAllDiscoverableUsers, sendChessGameMessage, setChessPresence, subscribeToChessGameMessages, subscribeToChessGameSession, subscribeToChessPresence, subscribeToUserChessGames, triggerChessInviteEmailNotification, updateChessGameSession } from "@/lib/firestore";
import { trackError } from "@/lib/telemetry";
import { resolveUserDisplayName } from "@/lib/utils";
import { ArrowRight, BookOpen, Brain, CheckCircle2, Clock3, Gamepad2, MessageSquare, Rocket, RotateCcw, Send, Sparkles, Trophy, Users, XCircle } from "lucide-react";

const MEMORY_EMOJIS = ["🍼", "🧸", "🌸", "⭐"];

function shuffleCards(cards) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function buildMemoryDeck() {
  return shuffleCards(
    MEMORY_EMOJIS.flatMap((emoji, index) => [
      { id: `${index}-a`, pairId: index, emoji, revealed: false, matched: false },
      { id: `${index}-b`, pairId: index, emoji, revealed: false, matched: false },
    ])
  );
}

const CHESS_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const CHESS_TEMPLATE = [
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
];
const CHESS_TYPE_BY_CODE = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};
const CHESS_SYMBOLS = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};
const CHESS_SOLID_SYMBOLS = {
  king: "♚",
  queen: "♛",
  rook: "♜",
  bishop: "♝",
  knight: "♞",
  pawn: "♟",
};
const CHESS_PIECE_ORDER = ["queen", "rook", "bishop", "knight", "pawn", "king"];
const CHESS_STARTING_COUNTS = {
  white: {
    king: 1,
    queen: 1,
    rook: 2,
    bishop: 2,
    knight: 2,
    pawn: 8,
  },
  black: {
    king: 1,
    queen: 1,
    rook: 2,
    bishop: 2,
    knight: 2,
    pawn: 8,
  },
};
const CHESS_TOURNAMENT_ROUND_SECONDS = 5 * 60;
const CHESS_PLAYER_TIME_SECONDS = 10 * 60;
const DISCOVERABLE_USERS_LIMIT = 120;
const MONTESSORI_SORT_ITEMS = [
  { id: "gold-round", shape: "round", color: "gold", symbol: "●", colorClassName: "border-amber-200 bg-amber-50 text-amber-600" },
  { id: "sky-square", shape: "square", color: "blue", symbol: "■", colorClassName: "border-sky-200 bg-sky-50 text-sky-600" },
  { id: "mint-triangle", shape: "triangle", color: "green", symbol: "▲", colorClassName: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  { id: "violet-round", shape: "round", color: "violet", symbol: "●", colorClassName: "border-violet-200 bg-violet-50 text-violet-600" },
  { id: "gold-triangle", shape: "triangle", color: "gold", symbol: "▲", colorClassName: "border-amber-200 bg-amber-50 text-amber-600" },
  { id: "slate-square", shape: "square", color: "slate", symbol: "■", colorClassName: "border-slate-200 bg-slate-50 text-slate-600" },
];
const MONTESSORI_SIZE_ITEMS = [
  { id: "small", order: 0, sizeClassName: "h-7 w-7", labelKey: "gamesMontessoriSizeSmall" },
  { id: "medium", order: 1, sizeClassName: "h-10 w-10", labelKey: "gamesMontessoriSizeMedium" },
  { id: "large", order: 2, sizeClassName: "h-14 w-14", labelKey: "gamesMontessoriSizeLarge" },
  { id: "xlarge", order: 3, sizeClassName: "h-[4.5rem] w-[4.5rem]", labelKey: "gamesMontessoriSizeXLarge" },
];

function ChessPieceGlyph({ piece, sizeClassName = "text-[2.42rem]" }) {
  const symbol = piece.symbol ?? CHESS_SOLID_SYMBOLS[piece.type];
  const isWhite = piece.color === "white";
  const pieceScaleClassName = piece.type === "pawn" ? "scale-[1.14] sm:scale-[1.26]" : "scale-[1.04] sm:scale-[1.08]";

  return (
    <span className={`relative inline-flex items-center justify-center leading-none ${sizeClassName} ${pieceScaleClassName}`}>
      <span aria-hidden className={`absolute translate-y-[2.4px] scale-[1.12] ${isWhite ? "text-[#6a4929]/28 blur-[0.95px]" : "text-black/28 blur-[0.7px]"}`}>
        {symbol}
      </span>
      <span aria-hidden className={`absolute -translate-y-[0.9px] scale-[1.05] ${isWhite ? "text-[#fffef8]/98" : "text-[#f2dcc4]/34"}`}>
        {symbol}
      </span>
      <span aria-hidden className={`absolute -translate-y-[1.7px] scale-[0.99] ${isWhite ? "text-[#fff7eb]/82" : "text-[#815a3b]/44"}`}>
        {symbol}
      </span>
      <span className={`relative font-serif leading-none ${isWhite ? "text-[#fffdfa] [text-shadow:0_1px_0_rgba(153,111,70,0.62),0_0_10px_rgba(255,255,255,0.28),0_14px_16px_rgba(92,62,30,0.14)]" : "text-[#2d1b12] [text-shadow:0_1px_0_rgba(255,246,233,0.18),0_0_8px_rgba(165,118,77,0.16),0_12px_14px_rgba(0,0,0,0.16)]"}`}>
        {symbol}
      </span>
    </span>
  );
}

function buildChessBoard() {
  return CHESS_TEMPLATE.map((row) =>
    row.map((cell) => {
      if (!cell) {
        return null;
      }

      return {
        color: cell[0] === "w" ? "white" : "black",
        type: CHESS_TYPE_BY_CODE[cell[1]],
      };
    })
  );
}

function isEligibleChessOpponent(userProfile = {}) {
  const moderationStatus = String(userProfile?.moderationStatus || "").trim().toLowerCase();
  return Boolean(userProfile?.id)
    && !userProfile?.profileHidden
    && !Boolean(userProfile?.messagingRestricted)
    && !["restricted", "suspended"].includes(moderationStatus);
}

function getChessInviteNoticeKeyFromError(error) {
  const errorCode = String(error?.message || "").trim();
  const firebaseCode = String(error?.code || "").trim().toLowerCase();

  if (firebaseCode === "permission-denied") {
    return "gamesChessPlatformInvitePermissions";
  }

  if (errorCode === "blocked_user" || errorCode === "blocked_by_user") {
    return "gamesChessPlatformInviteBlocked";
  }

  if (errorCode === "sender_messaging_restricted") {
    return "gamesChessPlatformInviteRestrictedSelf";
  }

  if (errorCode === "recipient_messaging_restricted") {
    return "gamesChessPlatformInviteRestrictedOpponent";
  }

  return "gamesChessPlatformInviteError";
}

function getChessMoveNoticeKeyFromError(error) {
  const errorCode = String(error?.message || "").trim();
  const firebaseCode = String(error?.code || "").trim().toLowerCase();

  if (firebaseCode === "permission-denied") {
    return "gamesChessPlatformInvitePermissions";
  }

  if (errorCode === "chess_game_turn_conflict") {
    return "gamesChessPlatformWaitTurn";
  }

  if (errorCode === "chess_game_state_conflict") {
    return "gamesChessPlatformMoveConflict";
  }

  return "gamesChessPlatformInviteError";
}

function getChessInviteDebugDetail(error) {
  const stage = String(error?.chessStage || "").trim();
  const code = String(error?.code || "").trim();
  const message = String(error?.message || "").trim();
  const parts = [
    stage ? `stage=${stage}` : "",
    code ? `code=${code}` : "",
    message ? `message=${message}` : "",
  ].filter(Boolean);

  return parts.join(" | ");
}

function cloneChessBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function getChessPieceCounts(board) {
  return board.reduce(
    (counts, row) => {
      row.forEach((piece) => {
        if (!piece) {
          return;
        }

        counts[piece.color][piece.type] += 1;
      });

      return counts;
    },
    {
      white: {
        king: 0,
        queen: 0,
        rook: 0,
        bishop: 0,
        knight: 0,
        pawn: 0,
      },
      black: {
        king: 0,
        queen: 0,
        rook: 0,
        bishop: 0,
        knight: 0,
        pawn: 0,
      },
    }
  );
}

function getCapturedChessPieces(board, color) {
  const counts = getChessPieceCounts(board)[color];

  return CHESS_PIECE_ORDER.flatMap((type) =>
    Array.from({ length: Math.max(0, CHESS_STARTING_COUNTS[color][type] - counts[type]) }, (_, index) => ({
      id: `${color}-${type}-${index}`,
      color,
      type,
    }))
  );
}

function isInsideChessBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function getSlidingChessMoves(board, row, col, color, directions) {
  const moves = [];

  directions.forEach(([rowStep, colStep]) => {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideChessBoard(nextRow, nextCol)) {
      const occupant = board[nextRow][nextCol];

      if (!occupant) {
        moves.push({ row: nextRow, col: nextCol });
        nextRow += rowStep;
        nextCol += colStep;
        continue;
      }

      if (occupant.color !== color) {
        moves.push({ row: nextRow, col: nextCol });
      }

      break;
    }
  });

  return moves;
}

function getChessMoves(board, row, col) {
  const piece = board[row][col];

  if (!piece) {
    return [];
  }

  if (piece.type === "pawn") {
    const direction = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;
    const moves = [];
    const oneStepRow = row + direction;

    if (isInsideChessBoard(oneStepRow, col) && !board[oneStepRow][col]) {
      moves.push({ row: oneStepRow, col });

      const twoStepRow = row + direction * 2;
      if (row === startRow && isInsideChessBoard(twoStepRow, col) && !board[twoStepRow][col]) {
        moves.push({ row: twoStepRow, col });
      }
    }

    [col - 1, col + 1].forEach((targetCol) => {
      if (!isInsideChessBoard(oneStepRow, targetCol)) {
        return;
      }

      const occupant = board[oneStepRow][targetCol];
      if (occupant && occupant.color !== piece.color) {
        moves.push({ row: oneStepRow, col: targetCol });
      }
    });

    return moves;
  }

  if (piece.type === "rook") {
    return getSlidingChessMoves(board, row, col, piece.color, [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  }

  if (piece.type === "bishop") {
    return getSlidingChessMoves(board, row, col, piece.color, [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]);
  }

  if (piece.type === "queen") {
    return getSlidingChessMoves(board, row, col, piece.color, [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]);
  }

  if (piece.type === "knight") {
    return [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]
      .map(([rowStep, colStep]) => ({ row: row + rowStep, col: col + colStep }))
      .filter(({ row: nextRow, col: nextCol }) => isInsideChessBoard(nextRow, nextCol))
      .filter(({ row: nextRow, col: nextCol }) => {
        const occupant = board[nextRow][nextCol];
        return !occupant || occupant.color !== piece.color;
      });
  }

  return [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ]
    .map(([rowStep, colStep]) => ({ row: row + rowStep, col: col + colStep }))
    .filter(({ row: nextRow, col: nextCol }) => isInsideChessBoard(nextRow, nextCol))
    .filter(({ row: nextRow, col: nextCol }) => {
      const occupant = board[nextRow][nextCol];
      return !occupant || occupant.color !== piece.color;
    });
}

function findKingPosition(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color && piece.type === "king") {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function isKingInCheck(board, color) {
  const kingPos = findKingPosition(board, color);
  if (!kingPos) return false;
  const opponentColor = color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== opponentColor) continue;
      const moves = getChessMoves(board, r, c);
      if (moves.some((m) => m.row === kingPos.row && m.col === kingPos.col)) {
        return true;
      }
    }
  }
  return false;
}

function getLegalChessMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  return getChessMoves(board, row, col).filter((move) => {
    const next = cloneChessBoard(board);
    next[move.row][move.col] = next[row][col];
    next[row][col] = null;
    return !isKingInCheck(next, piece.color);
  });
}

function hasAnyLegalMoves(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color && getLegalChessMoves(board, r, c).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function toChessSquare(row, col) {
  return `${CHESS_FILES[col]}${8 - row}`;
}

const AI_PIECE_VALUES = { pawn: 10, knight: 30, bishop: 30, rook: 50, queen: 90, king: 1000 };

function evaluateChessBoardForAI(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = AI_PIECE_VALUES[piece.type] || 0;
      score += piece.color === "black" ? val : -val;
    }
  }
  return score;
}

function applyAIChessMove(board, from, to) {
  const next = cloneChessBoard(board);
  const piece = next[from.row][from.col];
  const movedPiece = piece.type === "pawn" && (to.row === 0 || to.row === 7) ? { ...piece, type: "queen" } : piece;
  next[to.row][to.col] = movedPiece;
  next[from.row][from.col] = null;
  return next;
}

function getAllLegalMovesForColor(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== color) continue;
      getLegalChessMoves(board, r, c).forEach((to) => moves.push({ from: { row: r, col: c }, to }));
    }
  }
  return moves;
}

function minimaxChess(board, depth, alpha, beta, maximizing, deadline) {
  const color = maximizing ? "black" : "white";
  if (depth === 0 || (deadline && Date.now() > deadline)) return { score: evaluateChessBoardForAI(board), move: null };
  const moves = getAllLegalMovesForColor(board, color);
  if (moves.length === 0) {
    return { score: isKingInCheck(board, color) ? (maximizing ? -9999 : 9999) : 0, move: null };
  }
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove = moves[0];
  for (const move of moves) {
    if (deadline && Date.now() > deadline) break;
    const nextBoard = applyAIChessMove(board, move.from, move.to);
    const { score } = minimaxChess(nextBoard, depth - 1, alpha, beta, !maximizing, deadline);
    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (maximizing) { alpha = Math.max(alpha, bestScore); } else { beta = Math.min(beta, bestScore); }
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: bestMove };
}

function pickBestAIChessMove(board, depth = 2, budgetMs = 1500) {
  const deadline = Date.now() + budgetMs;
  return minimaxChess(board, depth, -Infinity, Infinity, true, deadline).move;
}

function formatCountdown(totalSeconds) {
  const safeTotal = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeTotal / 60);
  const seconds = safeTotal % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function GamesPage() {
  const { t, language } = useLanguage();
  const { user, userProfile } = useAuth();
  const { notifySystem } = useNotifications();
  const searchParams = useSearchParams();
  const [memoryCards, setMemoryCards] = useState(() => buildMemoryDeck());
  const [selectedCards, setSelectedCards] = useState([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const emotionScenarios = [
    {
      prompt: t("gamesEmotionScenarioOne"),
      correctEmotion: "sad",
      tip: t("gamesEmotionTipOne"),
    },
    {
      prompt: t("gamesEmotionScenarioTwo"),
      correctEmotion: "tired",
      tip: t("gamesEmotionTipTwo"),
    },
    {
      prompt: t("gamesEmotionScenarioThree"),
      correctEmotion: "frustrated",
      tip: t("gamesEmotionTipThree"),
    },
    {
      prompt: t("gamesEmotionScenarioFour"),
      correctEmotion: "joy",
      tip: t("gamesEmotionTipFour"),
    },
  ];
  const emotionOptions = [
    { id: "joy", emoji: "😊", label: t("gamesEmotionOptionJoy") },
    { id: "tired", emoji: "😴", label: t("gamesEmotionOptionTired") },
    { id: "frustrated", emoji: "😣", label: t("gamesEmotionOptionFrustrated") },
    { id: "sad", emoji: "😢", label: t("gamesEmotionOptionSad") },
  ];
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [emotionScore, setEmotionScore] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [emotionFeedback, setEmotionFeedback] = useState("idle");
  const [emotionCompleted, setEmotionCompleted] = useState(false);
  const [chessBoard, setChessBoard] = useState(() => buildChessBoard());
  const [chessTurn, setChessTurn] = useState("white");
  const [selectedBoardSquare, setSelectedBoardSquare] = useState(null);
  const [legalChessMoves, setLegalChessMoves] = useState([]);
  const [lastChessMove, setLastChessMove] = useState(null);
  const [chessBoardMessage, setChessBoardMessage] = useState("");
  const [chessPlayMode, setChessPlayMode] = useState("duel");
  const [tournamentUsername, setTournamentUsername] = useState("");
  const [tournamentPlayers, setTournamentPlayers] = useState([]);
  const [tournamentTimeLeft, setTournamentTimeLeft] = useState(CHESS_TOURNAMENT_ROUND_SECONDS);
  const [isTournamentRunning, setIsTournamentRunning] = useState(false);
  const [tournamentNotice, setTournamentNotice] = useState({ key: "gamesChessTournamentReady", values: {} });
  const [chessIndex, setChessIndex] = useState(0);
  const [chessScore, setChessScore] = useState(0);
  const [selectedChessPiece, setSelectedChessPiece] = useState(null);
  const [chessFeedback, setChessFeedback] = useState("idle");
  const [chessCompleted, setChessCompleted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState("idle");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [discoverableUsers, setDiscoverableUsers] = useState([]);
  const [discoverableUsersLoading, setDiscoverableUsersLoading] = useState(false);
  const [selectedChessOpponentId, setSelectedChessOpponentId] = useState("");
  const [selectedTournamentInviteId, setSelectedTournamentInviteId] = useState("");
  const [userChessGames, setUserChessGames] = useState([]);
  const [activeSharedChessGameId, setActiveSharedChessGameId] = useState("");
  const [activeSharedChessGame, setActiveSharedChessGame] = useState(null);
  const [platformNotice, setPlatformNotice] = useState({ key: "gamesChessPlatformInviteReady", values: {} });
  const [isChessMoveSyncing, setIsChessMoveSyncing] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [aiThinkingElapsed, setAiThinkingElapsed] = useState(0);
  const [whiteTimeLeft, setWhiteTimeLeft] = useState(CHESS_PLAYER_TIME_SECONDS);
  const [blackTimeLeft, setBlackTimeLeft] = useState(CHESS_PLAYER_TIME_SECONDS);
  const [chessGameOver, setChessGameOver] = useState(false);
  const [chessGameResult, setChessGameResult] = useState(null);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [chessOnlineUsers, setChessOnlineUsers] = useState({});
  const [chessIsPaused, setChessIsPaused] = useState(false);
  const [chessAbandonConfirmOpen, setChessAbandonConfirmOpen] = useState(false);
  const [montessoriSortIndex, setMontessoriSortIndex] = useState(0);
  const [montessoriSortSelections, setMontessoriSortSelections] = useState([]);
  const [montessoriSortFeedback, setMontessoriSortFeedback] = useState("idle");
  const [montessoriSizeBoard, setMontessoriSizeBoard] = useState(() => shuffleCards(MONTESSORI_SIZE_ITEMS));
  const [montessoriSizeSelections, setMontessoriSizeSelections] = useState([]);
  const [montessoriSizeFeedback, setMontessoriSizeFeedback] = useState("idle");
  const [montessoriSizeCompleted, setMontessoriSizeCompleted] = useState(false);
  const [chessChatMessages, setChessChatMessages] = useState([]);
  const [chessChatInput, setChessChatInput] = useState("");
  const [chessChatSending, setChessChatSending] = useState(false);
  const chessChatEndRef = useRef(null);
  const chessChatPrevCountRef = useRef(0);
  const chessChatInitialRef = useRef(true);
  const aiThinkingRef = useRef(false);

  const quizQuestions = [
    {
      prompt: t("gamesQuizQuestionOne"),
      options: [
        t("gamesQuizQuestionOneOptionOne"),
        t("gamesQuizQuestionOneOptionTwo"),
        t("gamesQuizQuestionOneOptionThree"),
      ],
      correctIndex: 0,
    },
    {
      prompt: t("gamesQuizQuestionTwo"),
      options: [
        t("gamesQuizQuestionTwoOptionOne"),
        t("gamesQuizQuestionTwoOptionTwo"),
        t("gamesQuizQuestionTwoOptionThree"),
      ],
      correctIndex: 0,
    },
    {
      prompt: t("gamesQuizQuestionThree"),
      options: [
        t("gamesQuizQuestionThreeOptionOne"),
        t("gamesQuizQuestionThreeOptionTwo"),
        t("gamesQuizQuestionThreeOptionThree"),
      ],
      correctIndex: 0,
    },
  ];

  const chessPieces = [
    { id: "king", symbol: CHESS_SOLID_SYMBOLS.king, label: t("gamesChessPieceKing") },
    { id: "queen", symbol: CHESS_SOLID_SYMBOLS.queen, label: t("gamesChessPieceQueen") },
    { id: "rook", symbol: CHESS_SOLID_SYMBOLS.rook, label: t("gamesChessPieceRook") },
    { id: "bishop", symbol: CHESS_SOLID_SYMBOLS.bishop, label: t("gamesChessPieceBishop") },
    { id: "knight", symbol: CHESS_SOLID_SYMBOLS.knight, label: t("gamesChessPieceKnight") },
    { id: "pawn", symbol: CHESS_SOLID_SYMBOLS.pawn, label: t("gamesChessPiecePawn") },
  ];
  const chessPieceLabels = {
    king: t("gamesChessPieceKing"),
    queen: t("gamesChessPieceQueen"),
    rook: t("gamesChessPieceRook"),
    bishop: t("gamesChessPieceBishop"),
    knight: t("gamesChessPieceKnight"),
    pawn: t("gamesChessPiecePawn"),
  };
  const chessChallenges = [
    {
      prompt: t("gamesChessPromptOne"),
      correctPiece: "knight",
      hint: t("gamesChessHintOne"),
    },
    {
      prompt: t("gamesChessPromptTwo"),
      correctPiece: "king",
      hint: t("gamesChessHintTwo"),
    },
    {
      prompt: t("gamesChessPromptThree"),
      correctPiece: "bishop",
      hint: t("gamesChessHintThree"),
    },
    {
      prompt: t("gamesChessPromptFour"),
      correctPiece: "rook",
      hint: t("gamesChessHintFour"),
    },
  ];
  const chessPlayModes = [
    {
      id: "solo",
      title: t("gamesChessModeSoloTitle"),
      description: t("gamesChessModeSoloDesc"),
    },
    {
      id: "duel",
      title: t("gamesChessModeDuelTitle"),
      description: t("gamesChessModeDuelDesc"),
    },
    {
      id: "tournament",
      title: t("gamesChessModeTournamentTitle"),
      description: t("gamesChessModeTournamentDesc"),
    },
  ];
  const montessoriSortPrompts = [
    {
      id: "round",
      label: t("gamesMontessoriSortPromptOne"),
      matches: (item) => item.shape === "round",
    },
    {
      id: "gold",
      label: t("gamesMontessoriSortPromptTwo"),
      matches: (item) => item.color === "gold",
    },
    {
      id: "triangle",
      label: t("gamesMontessoriSortPromptThree"),
      matches: (item) => item.shape === "triangle",
    },
  ];
  const availableGamesCount = 6;

  const heroHighlights = [
    t("gamesHeroHighlightCommunity"),
    t("gamesHeroHighlightCognitive"),
    t("gamesHeroHighlightMontessori"),
  ];
  const ecosystemPillars = [
    {
      id: "community",
      icon: Users,
      iconClassName: "bg-cyan-100 text-cyan-700",
      title: t("gamesPillarCommunityTitle"),
      description: t("gamesPillarCommunityDesc"),
    },
    {
      id: "development",
      icon: Brain,
      iconClassName: "bg-violet-100 text-violet-700",
      title: t("gamesPillarDevelopmentTitle"),
      description: t("gamesPillarDevelopmentDesc"),
    },
    {
      id: "montessori",
      icon: BookOpen,
      iconClassName: "bg-amber-100 text-amber-700",
      title: t("gamesPillarMontessoriTitle"),
      description: t("gamesPillarMontessoriDesc"),
    },
  ];
  const gameFamilies = [
    {
      id: "chess",
      icon: Trophy,
      status: t("gamesUniverseStatusAvailable"),
      statusClassName: "border-transparent bg-cyan-100 text-cyan-700",
      title: t("gamesUniverseChessTitle"),
      description: t("gamesUniverseChessDesc"),
      featureKeys: [
        "gamesUniverseChessFeatureOne",
        "gamesUniverseChessFeatureTwo",
        "gamesUniverseChessFeatureThree",
      ],
    },
    {
      id: "cognitive",
      icon: Brain,
      status: t("gamesUniverseStatusAvailable"),
      statusClassName: "border-transparent bg-emerald-100 text-emerald-700",
      title: t("gamesUniverseCognitiveTitle"),
      description: t("gamesUniverseCognitiveDesc"),
      featureKeys: [
        "gamesUniverseCognitiveFeatureOne",
        "gamesUniverseCognitiveFeatureTwo",
        "gamesUniverseCognitiveFeatureThree",
      ],
    },
    {
      id: "montessori",
      icon: Sparkles,
      status: t("gamesUniverseStatusAvailable"),
      statusClassName: "border-transparent bg-amber-100 text-amber-700",
      title: t("gamesUniverseMontessoriTitle"),
      description: t("gamesUniverseMontessoriDesc"),
      featureKeys: [
        "gamesUniverseMontessoriFeatureOne",
        "gamesUniverseMontessoriFeatureTwo",
        "gamesUniverseMontessoriFeatureThree",
      ],
    },
  ];
  const membershipTiers = [
    {
      id: "free",
      icon: Gamepad2,
      title: t("gamesSubscriptionFreeTitle"),
      description: t("gamesSubscriptionFreeDesc"),
      badge: null,
      cardClassName: "border border-sky-100 bg-white text-slate-900",
      featureTextClassName: "text-slate-600",
      featureKeys: [
        "gamesSubscriptionFreeFeatureOne",
        "gamesSubscriptionFreeFeatureTwo",
        "gamesSubscriptionFreeFeatureThree",
      ],
    },
    {
      id: "kids-club",
      icon: Rocket,
      title: t("gamesSubscriptionPremiumTitle"),
      description: t("gamesSubscriptionPremiumDesc"),
      badge: t("gamesSubscriptionLaunchLabel"),
      cardClassName: "border border-cyan-400/20 bg-[linear-gradient(135deg,_rgba(8,145,178,0.98)_0%,_rgba(37,99,235,0.97)_58%,_rgba(124,58,237,0.94)_100%)] text-white",
      featureTextClassName: "text-white/80",
      featureKeys: [
        "gamesSubscriptionPremiumFeatureOne",
        "gamesSubscriptionPremiumFeatureTwo",
        "gamesSubscriptionPremiumFeatureThree",
      ],
    },
  ];
  const roadmapItems = [
    t("gamesRoadmapItemOne"),
    t("gamesRoadmapItemTwo"),
    t("gamesRoadmapItemThree"),
    t("gamesRoadmapItemFour"),
  ];
  const playgroundQuickLinks = [
    {
      id: "chess",
      href: "#chess-game",
      icon: Trophy,
      iconClassName: "bg-cyan-100 text-cyan-700",
      title: t("gamesChessTitle"),
      description: t("gamesUniverseChessDesc"),
    },
    {
      id: "montessori",
      href: "#montessori-game",
      icon: BookOpen,
      iconClassName: "bg-rose-100 text-rose-700",
      title: t("gamesMontessoriTitle"),
      description: t("gamesMontessoriDesc"),
    },
    {
      id: "memory",
      href: "#memory-game",
      icon: Brain,
      iconClassName: "bg-violet-100 text-violet-700",
      title: t("gamesMemoryTitle"),
      description: t("gamesMemoryDesc"),
    },
    {
      id: "emotion",
      href: "#emotion-game",
      icon: CheckCircle2,
      iconClassName: "bg-emerald-100 text-emerald-700",
      title: t("gamesEmotionTitle"),
      description: t("gamesEmotionDesc"),
    },
    {
      id: "quiz",
      href: "#quiz-game",
      icon: Sparkles,
      iconClassName: "bg-orange-100 text-orange-700",
      title: t("gamesQuizTitle"),
      description: t("gamesQuizDesc"),
    },
  ];
  const featuredPlaygroundZones = [
    {
      id: "chess",
      href: "#chess-game",
      icon: Trophy,
      badge: t("gamesChessBadge"),
      title: t("gamesChessTitle"),
      description: t("gamesChessDesc"),
      meta: t("gamesUniverseChessFeatureOne"),
      cardClassName: "border-rose-100 bg-[linear-gradient(135deg,_rgba(255,241,242,0.98)_0%,_rgba(255,255,255,0.98)_100%)]",
      iconClassName: "bg-rose-100 text-rose-700",
      metaClassName: "bg-rose-600 text-white",
    },
    {
      id: "montessori",
      href: "#montessori-game",
      icon: BookOpen,
      badge: t("gamesMontessoriBadge"),
      title: t("gamesMontessoriTitle"),
      description: t("gamesMontessoriDesc"),
      meta: t("gamesMontessoriSortTitle"),
      cardClassName: "border-rose-100 bg-[linear-gradient(135deg,_rgba(255,241,242,0.98)_0%,_rgba(255,255,255,0.98)_100%)]",
      iconClassName: "bg-rose-100 text-rose-700",
      metaClassName: "bg-rose-600 text-white",
    },
  ];
  const compactPlaygroundLinks = playgroundQuickLinks.filter((item) => ["memory", "emotion", "quiz"].includes(item.id));

  const currentChessChallenge = chessChallenges[chessIndex];
  const selectedBoardPiece = selectedBoardSquare ? chessBoard[selectedBoardSquare.row]?.[selectedBoardSquare.col] : null;
  const currentEmotion = emotionScenarios[emotionIndex];
  const currentQuiz = quizQuestions[quizIndex];
  const currentMontessoriSortPrompt = montessoriSortPrompts[montessoriSortIndex];
  const resolvedTournamentUsername = resolveUserDisplayName(userProfile, user, "");
  const selectedChessOpponent = discoverableUsers.find((member) => member.id === selectedChessOpponentId) || null;
  const selectedTournamentInviteMember = discoverableUsers.find((member) => member.id === selectedTournamentInviteId) || null;
  const activeSharedChessPlayerColor = activeSharedChessGame?.playerColorByUserId?.[user?.uid || ""] || "";
  const activeSharedChessOpponentId = activeSharedChessGame?.participants?.find((participantId) => participantId !== user?.uid) || "";
  const activeSharedChessOpponentName = activeSharedChessOpponentId
    ? String(activeSharedChessGame?.participantNames?.[activeSharedChessOpponentId] || "").trim()
    : "";
  const isPlatformChessActive = chessPlayMode === "duel" && Boolean(activeSharedChessGameId && activeSharedChessGame);
  const platformNoticeLabel = t(platformNotice.key, platformNotice.values);
  const platformNoticeDetail = String(platformNotice?.detail || "").trim();
  const montessoriSortExpectedIds = MONTESSORI_SORT_ITEMS
    .filter((item) => currentMontessoriSortPrompt.matches(item))
    .map((item) => item.id)
    .sort();
  const matchedPairs = memoryCards.filter((card) => card.matched).length / 2;
  const allPairsFound = matchedPairs === MEMORY_EMOJIS.length;
  const capturedWhitePieces = getCapturedChessPieces(chessBoard, "white");
  const capturedBlackPieces = getCapturedChessPieces(chessBoard, "black");
  const currentBoardMessage = chessBoardMessage || (
    isPlatformChessActive && activeSharedChessPlayerColor
      ? t(chessTurn === activeSharedChessPlayerColor ? "gamesChessPlatformYourTurn" : "gamesChessPlatformWaitTurn")
      : t("gamesChessBoardHelp")
  );
  const selectedChessPlayMode = chessPlayModes.find((mode) => mode.id === chessPlayMode) ?? chessPlayModes[1];
  const tournamentTimerLabel = formatCountdown(tournamentTimeLeft);
  const tournamentNoticeLabel = t(tournamentNotice.key, tournamentNotice.values);
  const tournamentCanStart = tournamentPlayers.length >= 2;
  const tournamentHasStarted = tournamentTimeLeft < CHESS_TOURNAMENT_ROUND_SECONDS;
  const tournamentNoticeIsWarning = [
    "gamesChessTournamentNameRequired",
    "gamesChessTournamentDuplicate",
    "gamesChessTournamentNeedPlayers",
    "gamesChessTournamentTimeUp",
    "gamesChessTournamentInviteLoginRequired",
    "gamesChessTournamentInviteEmpty",
    "gamesChessPlatformInviteRestrictedOpponent",
    "gamesChessPlatformInviteRestrictedSelf",
    "gamesChessPlatformInviteBlocked",
  ].includes(tournamentNotice.key);
  const lastChessMoveLabel = lastChessMove
    ? `${toChessSquare(lastChessMove.from.row, lastChessMove.from.col)} → ${toChessSquare(lastChessMove.to.row, lastChessMove.to.col)}`
    : t("gamesChessBoardNoLastMove");
  const chessChallengeProgressLabel = `${chessCompleted ? chessChallenges.length : chessIndex + 1}/${chessChallenges.length}`;
  const chessMessage =
    chessFeedback === "correct"
      ? t("gamesChessCorrect")
      : chessFeedback === "wrong"
        ? t("gamesChessWrong")
        : chessCompleted
          ? t("gamesChessCompleted")
          : currentChessChallenge?.hint;
  const chessCoachObjective = chessCompleted ? currentBoardMessage : currentChessChallenge?.prompt || currentBoardMessage;
  const chessCoachTipClassName = chessFeedback === "correct"
    ? "border-emerald-200/90 bg-emerald-50/95 text-emerald-800"
    : chessFeedback === "wrong"
      ? "border-amber-200/90 bg-amber-50/95 text-amber-800"
      : "border-rose-100/90 bg-white/85 text-slate-700";
  const chessCoachHighlights = [
    {
      id: "turn",
      icon: Rocket,
      label: t("gamesChessBoardTurn"),
      value: t(chessTurn === "white" ? "gamesChessBoardWhite" : "gamesChessBoardBlack"),
      className: "border-rose-100 bg-[linear-gradient(135deg,_rgba(255,241,242,0.96)_0%,_rgba(255,247,237,0.98)_100%)] text-rose-700",
    },
    {
      id: "piece",
      icon: Sparkles,
      label: t("gamesChessBoardPiece"),
      value: selectedBoardPiece ? getChessPieceLabel(selectedBoardPiece) : t("gamesChessBoardNone"),
      className: "border-violet-100 bg-[linear-gradient(135deg,_rgba(245,243,255,0.98)_0%,_rgba(255,255,255,0.98)_100%)] text-violet-700",
    },
    {
      id: "mode",
      icon: Brain,
      label: t("gamesChessModeActive"),
      value: selectedChessPlayMode.title,
      className: "border-amber-100 bg-[linear-gradient(135deg,_rgba(255,251,235,0.98)_0%,_rgba(255,255,255,0.98)_100%)] text-amber-700",
    },
    {
      id: "move",
      icon: CheckCircle2,
      label: t("gamesChessBoardLastMove"),
      value: lastChessMoveLabel,
      className: "border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.98)_0%,_rgba(255,255,255,0.98)_100%)] text-slate-700",
    },
  ];
  const emotionMessage =
    emotionFeedback === "correct"
      ? t("gamesEmotionCorrect")
      : emotionFeedback === "wrong"
        ? t("gamesEmotionWrong")
        : emotionCompleted
          ? t("gamesEmotionCompleted")
          : currentEmotion?.tip;
  const montessoriSortMessage =
    montessoriSortFeedback === "correct"
      ? t("gamesMontessoriSortCorrect")
      : montessoriSortFeedback === "wrong"
        ? t("gamesMontessoriSortWrong")
        : currentMontessoriSortPrompt.label;
  const montessoriSizeMessage =
    montessoriSizeCompleted
      ? t("gamesMontessoriSizeCompleted")
      : montessoriSizeFeedback === "wrong"
        ? t("gamesMontessoriSizeWrong")
        : montessoriSizeFeedback === "correct"
          ? t("gamesMontessoriSizeCorrect")
          : t("gamesMontessoriSizeDesc");
  const montessoriSortSelectionCount = montessoriSortSelections.length;
  const montessoriSortProgressPercent = Math.round(((montessoriSortIndex + 1) / montessoriSortPrompts.length) * 100);
  const montessoriSortMessageClassName = montessoriSortFeedback === "correct"
    ? "border-rose-200 bg-rose-50/90 text-rose-700"
    : montessoriSortFeedback === "wrong"
      ? "border-orange-200 bg-orange-50/95 text-orange-700"
      : "border-rose-100/70 bg-white/85 text-rose-700";
  const montessoriSizeProgressPercent = Math.round((montessoriSizeSelections.length / montessoriSizeBoard.length) * 100);
  const montessoriSizeMessageClassName = montessoriSizeCompleted
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : montessoriSizeFeedback === "wrong"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : montessoriSizeFeedback === "correct"
        ? "border-rose-100 bg-rose-50/70 text-rose-700"
        : "border-rose-100/70 bg-white/85 text-slate-600";

  useEffect(() => {
    if (!isAIThinking) { setAiThinkingElapsed(0); return; }
    const interval = setInterval(() => setAiThinkingElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isAIThinking]);

  useEffect(() => {
    const clockModes = ["solo", "duel"];
    if (!clockModes.includes(chessPlayMode) || chessGameOver || chessIsPaused || isPlatformChessActive) return;
    const interval = setInterval(() => {
      if (chessTurn === "white") {
        setWhiteTimeLeft((prev) => {
          if (prev <= 1) {
            setChessGameOver(true);
            setChessGameResult("timeout");
            setChessBoardMessage(language === "ht" ? "Tan ou fini ! Nwa genyen." : "Temps écoulé ! Les noirs gagnent.");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTimeLeft((prev) => {
          if (prev <= 1) {
            setChessGameOver(true);
            setChessGameResult("timeout");
            setChessBoardMessage(language === "ht" ? "Tan IA fini ! Blan genyen." : "Temps écoulé ! Les blancs gagnent.");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [chessPlayMode, chessTurn, chessGameOver, chessIsPaused, isPlatformChessActive, language]);

  useEffect(() => {
    if (chessPlayMode !== "solo" || chessTurn !== "black" || chessGameOver) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    setIsAIThinking(true);
    setAiThinkingElapsed(0);
    setChessBoardMessage(language === "ht" ? "IA ap réfléchi..." : "L'IA réfléchit...");
    const timeout = setTimeout(() => {
      const depth = aiDifficulty === "easy" ? 1 : 2;
      const budgetMs = aiDifficulty === "easy" ? 300 : aiDifficulty === "hard" ? 900 : 600;
      const move = pickBestAIChessMove(chessBoard, depth, budgetMs);
      if (!move) { aiThinkingRef.current = false; setIsAIThinking(false); return; }
      const { from, to } = move;
      const nextBoard = cloneChessBoard(chessBoard);
      const movingPiece = nextBoard[from.row][from.col];
      const capturedPiece = nextBoard[to.row][to.col];
      const movedPiece = movingPiece.type === "pawn" && (to.row === 0 || to.row === 7) ? { ...movingPiece, type: "queen" } : movingPiece;
      nextBoard[to.row][to.col] = movedPiece;
      nextBoard[from.row][from.col] = null;
      const opponentInCheck = isKingInCheck(nextBoard, "white");
      const opponentHasMoves = hasAnyLegalMoves(nextBoard, "white");
      let msg = capturedPiece
        ? (language === "ht" ? `IA: l'a pran ${capturedPiece.type}` : `IA: capture un ${capturedPiece.type}`)
        : (language === "ht" ? "IA a jwe." : "L'IA a joué.");
      if (!opponentHasMoves) {
        if (opponentInCheck) {
          setChessGameOver(true);
          setChessGameResult("checkmate");
          msg = language === "ht" ? "Echèk e mat ! IA genyen." : "Échec et mat ! L'IA gagne.";
        } else {
          setChessGameOver(true);
          setChessGameResult("stalemate");
          msg = language === "ht" ? "Pat !" : "Pat !";
        }
      } else if (opponentInCheck) {
        msg = language === "ht" ? "Echèk !" : "Échec !";
      }
      setChessBoard(nextBoard);
      setLastChessMove({ from, to });
      setChessTurn("white");
      setChessBoardMessage(msg);
      setSelectedBoardSquare(null);
      setLegalChessMoves([]);
      aiThinkingRef.current = false;
      setIsAIThinking(false);
    }, 300);
    return () => {
      clearTimeout(timeout);
      aiThinkingRef.current = false;
    };
  }, [chessPlayMode, chessTurn, chessGameOver, chessBoard, language, aiDifficulty]);

  useEffect(() => {
    if (chessPlayMode !== "tournament" && isTournamentRunning) {
      setIsTournamentRunning(false);
    }
  }, [chessPlayMode, isTournamentRunning]);

  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    setChessPresence(uid).catch(() => {});
    const interval = setInterval(() => {
      setChessPresence(uid).catch(() => {});
    }, 60000);
    return () => {
      clearInterval(interval);
      clearChessPresence(uid).catch(() => {});
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToChessPresence(
      (online) => setChessOnlineUsers(online),
      () => {}
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setDiscoverableUsers([]);
      setSelectedChessOpponentId("");
      setSelectedTournamentInviteId("");
      return;
    }

    let isMounted = true;
    setDiscoverableUsersLoading(true);

    getAllDiscoverableUsers({ excludeUserId: user.uid, batchLimit: DISCOVERABLE_USERS_LIMIT })
      .then((usersList) => {
        if (!isMounted) {
          return;
        }

        const nextUsersList = Array.isArray(usersList) ? usersList : [];

        setDiscoverableUsers(nextUsersList);
        setSelectedChessOpponentId((currentValue) => {
          if (currentValue && nextUsersList.some((member) => member.id === currentValue)) {
            return currentValue;
          }

          return nextUsersList[0]?.id || "";
        });
        setSelectedTournamentInviteId((currentValue) => {
          if (currentValue && nextUsersList.some((member) => member.id === currentValue)) {
            return currentValue;
          }

          return nextUsersList[0]?.id || "";
        });
      })
      .catch(() => {
        if (isMounted) {
          setDiscoverableUsers([]);
          setSelectedChessOpponentId("");
          setSelectedTournamentInviteId("");
        }
      })
      .finally(() => {
        if (isMounted) {
          setDiscoverableUsersLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setUserChessGames([]);
      setActiveSharedChessGameId("");
      return () => {};
    }

    return subscribeToUserChessGames(
      user.uid,
      (games) => {
        setUserChessGames(games);
        setActiveSharedChessGameId((currentValue) => {
          if (currentValue && games.some((game) => game.id === currentValue)) {
            return currentValue;
          }

          return games[0]?.id || "";
        });
      },
      () => {
        setUserChessGames([]);
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !activeSharedChessGameId) {
      setActiveSharedChessGame(null);
      return () => {};
    }

    return subscribeToChessGameSession(
      activeSharedChessGameId,
      user.uid,
      (game) => {
        setActiveSharedChessGame(game);
      },
      () => {
        setActiveSharedChessGame(null);
      }
    );
  }, [activeSharedChessGameId, user?.uid]);

  useEffect(() => {
    chessChatInitialRef.current = true;
    if (!activeSharedChessGameId) {
      setChessChatMessages([]);
      return () => {};
    }

    return subscribeToChessGameMessages(
      activeSharedChessGameId,
      (messages) => setChessChatMessages(messages),
      () => {}
    );
  }, [activeSharedChessGameId]);

  useEffect(() => {
    if (chessChatInitialRef.current) {
      chessChatInitialRef.current = false;
      chessChatPrevCountRef.current = chessChatMessages.length;
      return;
    }
    if (chessChatMessages.length > chessChatPrevCountRef.current && chessChatEndRef.current) {
      chessChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    chessChatPrevCountRef.current = chessChatMessages.length;
  }, [chessChatMessages]);

  useEffect(() => {
    if (!isPlatformChessActive || !activeSharedChessGame) {
      return;
    }

    setChessBoard(activeSharedChessGame.board?.length ? cloneChessBoard(activeSharedChessGame.board) : buildChessBoard());
    setChessTurn(activeSharedChessGame.turn || "white");
    setLastChessMove(activeSharedChessGame.lastMove || null);
    setSelectedBoardSquare(null);
    setLegalChessMoves([]);
    setChessBoardMessage("");
    const remoteStatus = String(activeSharedChessGame.status || "").toLowerCase();
    if (remoteStatus === "checkmate" || remoteStatus === "stalemate" || remoteStatus === "resigned") {
      setChessGameOver(true);
      setChessGameResult(remoteStatus);
      if (remoteStatus === "resigned" && activeSharedChessGame.boardMessage) {
        setChessBoardMessage(activeSharedChessGame.boardMessage);
      }
    } else {
      setChessGameOver(false);
      setChessGameResult(null);
    }
  }, [activeSharedChessGame, isPlatformChessActive, t]);

  useEffect(() => {
    if (!searchParams || !userChessGames.length) return;
    const urlGameId = searchParams.get("gameId");
    if (!urlGameId) return;
    const matchingGame = userChessGames.find((g) => g.id === urlGameId);
    if (matchingGame) {
      setActiveSharedChessGameId(urlGameId);
      setChessPlayMode("duel");
    }
  }, [searchParams, userChessGames]);

  useEffect(() => {
    if (chessPlayMode !== "tournament") {
      return;
    }

    if (isTournamentRunning) {
      return;
    }

    setChessBoardMessage(t(tournamentTimeLeft === 0 ? "gamesChessTournamentTimeUp" : "gamesChessTournamentStartPrompt"));
  }, [chessPlayMode, isTournamentRunning, tournamentTimeLeft, t]);

  useEffect(() => {
    if (chessPlayMode !== "tournament" || !isTournamentRunning || tournamentTimeLeft <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setTournamentTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [chessPlayMode, isTournamentRunning, tournamentTimeLeft]);

  useEffect(() => {
    if (chessPlayMode === "tournament" && isTournamentRunning && tournamentTimeLeft === 0) {
      setIsTournamentRunning(false);
      setTournamentNotice({ key: "gamesChessTournamentTimeUp", values: {} });
    }
  }, [chessPlayMode, isTournamentRunning, tournamentTimeLeft]);

  function resetMemoryGame() {
    setMemoryCards(buildMemoryDeck());
    setSelectedCards([]);
    setMemoryMoves(0);
    setIsChecking(false);
  }

  function resetEmotionGame() {
    setEmotionIndex(0);
    setEmotionScore(0);
    setSelectedEmotion(null);
    setEmotionFeedback("idle");
    setEmotionCompleted(false);
  }

  function resetChessGame() {
    setChessIndex(0);
    setChessScore(0);
    setSelectedChessPiece(null);
    setChessFeedback("idle");
    setChessCompleted(false);
  }

  function resetChessBoard() {
    setChessBoard(buildChessBoard());
    setChessTurn("white");
    setSelectedBoardSquare(null);
    setLegalChessMoves([]);
    setLastChessMove(null);
    setChessBoardMessage("");
    setChessGameOver(false);
    setChessGameResult(null);
    setChessIsPaused(false);
    setWhiteTimeLeft(CHESS_PLAYER_TIME_SECONDS);
    setBlackTimeLeft(CHESS_PLAYER_TIME_SECONDS);
    aiThinkingRef.current = false;
    setIsAIThinking(false);
  }

  function getPlatformMemberName(member) {
    return resolveUserDisplayName(member, null, String(member?.email || "").split("@")[0] || "Joueur");
  }

  function getChessGameOpponentName(game) {
    const opponentId = game?.participants?.find((participantId) => participantId !== user?.uid) || "";
    return opponentId ? String(game?.participantNames?.[opponentId] || "").trim() : "";
  }

  async function ensureSharedChessInvite(opponent) {
    const opponentId = String(opponent?.id || "").trim();
    if (!user?.uid) {
      throw new Error("login_required");
    }

    if (!opponentId) {
      throw new Error("missing_chess_opponent");
    }

    if (!isEligibleChessOpponent(opponent)) {
      throw new Error("recipient_messaging_restricted");
    }

    const existingGame = userChessGames.find((game) => game.participants?.includes(opponentId));
    if (existingGame?.id) {
      try {
        await createChessInviteNotification({
          senderId: user.uid,
          recipientId: opponentId,
          gameId: existingGame.id,
          senderName: resolvedTournamentUsername || "Joueur 1",
        });
      } catch {
      }

      try {
        await triggerChessInviteEmailNotification(existingGame.id, opponentId);
      } catch {
      }

      return {
        gameId: existingGame.id,
        opponentName: getChessGameOpponentName(existingGame) || getPlatformMemberName(opponent),
      };
    }

    const nextGameId = await createChessGameSession({
      hostId: user.uid,
      guestId: opponentId,
      hostName: resolvedTournamentUsername || "Joueur 1",
      guestName: getPlatformMemberName(opponent) || "Joueur 2",
      board: buildChessBoard(),
      turn: "white",
      boardMessage: "",
      status: "active",
    });

    try {
      await createChessInviteNotification({
        senderId: user.uid,
        recipientId: opponentId,
        gameId: nextGameId,
        senderName: resolvedTournamentUsername || "Joueur 1",
      });
    } catch {
    }

    try {
      await triggerChessInviteEmailNotification(nextGameId, opponentId);
    } catch {
    }

    return {
      gameId: nextGameId,
      opponentName: getPlatformMemberName(opponent),
    };
  }

  async function handleCreatePlatformChessGame() {
    if (!user?.uid) {
      setPlatformNotice({ key: "gamesChessPlatformLoginRequired", values: {} });
      return;
    }

    if (!selectedChessOpponentId) {
      setPlatformNotice({ key: "gamesChessPlatformPlayersEmpty", values: {} });
      return;
    }

    if (!selectedChessOpponent) {
      setPlatformNotice({ key: "gamesChessPlatformPlayersEmpty", values: {} });
      return;
    }

    if (!isEligibleChessOpponent(selectedChessOpponent)) {
      setPlatformNotice({ key: "gamesChessPlatformInviteRestrictedOpponent", values: {} });
      return;
    }

    const finishedStatuses = ["checkmate", "stalemate", "resigned"];
    const activeGamesWithOthers = userChessGames.filter((game) => {
      const status = String(game.status || "").toLowerCase();
      if (finishedStatuses.includes(status)) return false;
      const opponentInGame = game.participants?.find((p) => p !== user?.uid);
      return opponentInGame && opponentInGame !== selectedChessOpponentId;
    });
    if (activeGamesWithOthers.length > 0) {
      const currentOpponentName = getChessGameOpponentName(activeGamesWithOthers[0]) || "un adversaire";
      setPlatformNotice({
        key: "gamesChessPlatformAlreadyActive",
        values: { name: currentOpponentName },
      });
      handleOpenSharedChessGame(activeGamesWithOthers[0].id);
      return;
    }

    try {
      const { gameId, opponentName } = await ensureSharedChessInvite(selectedChessOpponent);
      const invitedName = opponentName || (selectedChessOpponent ? getPlatformMemberName(selectedChessOpponent) : "");
      setActiveSharedChessGameId(gameId);
      setChessPlayMode("duel");
      setPlatformNotice({
        key: "gamesChessPlatformInviteSent",
        values: { name: invitedName },
      });
      notifySystem(t("gamesChessPlatformInvite"), t("gamesChessPlatformInviteSent", { name: invitedName }), "/games");
      setTimeout(() => {
        document.getElementById("chess-board-area")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (error) {
      trackError(error, {
        scope: "games_create_platform_chess_game",
        selectedChessOpponentId,
        uid: user.uid,
      });
      setPlatformNotice({
        key: getChessInviteNoticeKeyFromError(error),
        values: {},
        detail: getChessInviteDebugDetail(error),
      });
    }
  }

  function handleChessTogglePause() {
    setChessIsPaused((prev) => !prev);
  }

  function handleChessAbandon() {
    setChessAbandonConfirmOpen(true);
  }

  async function confirmChessAbandon() {
    setChessAbandonConfirmOpen(false);
    const resignerName = resolvedTournamentUsername || "Joueur";
    const abandonMessage = t("gamesChessBoardAbandonResult", { name: resignerName });
    setChessGameOver(true);
    setChessGameResult("resigned");
    setChessBoardMessage(abandonMessage);
    if (isPlatformChessActive && activeSharedChessGameId) {
      try {
        await updateChessGameSession(activeSharedChessGameId, {
          status: "resigned",
          boardMessage: abandonMessage,
          resignedBy: user?.uid || "",
        });
      } catch {}
    }
  }

  function handleOpenSharedChessGame(gameId) {
    setActiveSharedChessGameId(gameId);
    setChessPlayMode("duel");
    setPlatformNotice({ key: "gamesChessPlatformLoaded", values: {} });
    setTimeout(() => {
      document.getElementById("chess-board-area")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  async function handleResetSharedChessGame() {
    if (!activeSharedChessGameId || isChessMoveSyncing) {
      return;
    }

    setIsChessMoveSyncing(true);
    setChessGameOver(false);
    setChessGameResult(null);
    setChessIsPaused(false);
    try {
      await updateChessGameSession(activeSharedChessGameId, {
        board: buildChessBoard(),
        turn: "white",
        lastMove: null,
        boardMessage: "",
        status: "active",
      });
      setChessBoardMessage(t("gamesChessPlatformResetDone"));
    } catch (error) {
      setPlatformNotice({ key: getChessMoveNoticeKeyFromError(error), values: {}, detail: getChessInviteDebugDetail(error) });
    } finally {
      setIsChessMoveSyncing(false);
    }
  }

  async function handleSendChessChat(event) {
    event?.preventDefault();
    if (!user?.uid || !activeSharedChessGameId || !chessChatInput.trim() || chessChatSending) {
      return;
    }

    const text = chessChatInput.trim();
    setChessChatInput("");
    setChessChatSending(true);
    try {
      await sendChessGameMessage(activeSharedChessGameId, user.uid, resolveUserDisplayName(userProfile, user, "Joueur"), text);
    } catch {
    } finally {
      setChessChatSending(false);
    }
  }

  function handleMontessoriSortToggle(itemId) {
    setMontessoriSortSelections((currentSelections) => (
      currentSelections.includes(itemId)
        ? currentSelections.filter((currentId) => currentId !== itemId)
        : [...currentSelections, itemId]
    ));
    setMontessoriSortFeedback("idle");
  }

  function handleMontessoriSortValidate() {
    const selectedIds = [...montessoriSortSelections].sort();
    const isCorrect = selectedIds.length === montessoriSortExpectedIds.length
      && selectedIds.every((itemId, index) => itemId === montessoriSortExpectedIds[index]);

    setMontessoriSortFeedback(isCorrect ? "correct" : "wrong");
  }

  function handleNextMontessoriSort() {
    setMontessoriSortIndex((currentIndex) => (currentIndex === montessoriSortPrompts.length - 1 ? 0 : currentIndex + 1));
    setMontessoriSortSelections([]);
    setMontessoriSortFeedback("idle");
  }

  function resetMontessoriSizeGame() {
    setMontessoriSizeBoard(shuffleCards(MONTESSORI_SIZE_ITEMS));
    setMontessoriSizeSelections([]);
    setMontessoriSizeFeedback("idle");
    setMontessoriSizeCompleted(false);
  }

  function handleMontessoriSizeSelection(itemId) {
    if (montessoriSizeCompleted || montessoriSizeSelections.includes(itemId)) {
      return;
    }

    const selectedItem = montessoriSizeBoard.find((item) => item.id === itemId);
    if (!selectedItem) {
      return;
    }

    const expectedOrder = montessoriSizeSelections.length;
    if (selectedItem.order !== expectedOrder) {
      setMontessoriSizeSelections([]);
      setMontessoriSizeFeedback("wrong");
      return;
    }

    const nextSelections = [...montessoriSizeSelections, itemId];
    setMontessoriSizeSelections(nextSelections);
    setMontessoriSizeFeedback("correct");

    if (nextSelections.length === montessoriSizeBoard.length) {
      setMontessoriSizeCompleted(true);
    }
  }

  function handleTournamentRegistration() {
    const nextUsername = String(tournamentUsername || resolvedTournamentUsername || "").trim();

    if (!nextUsername) {
      setTournamentNotice({ key: "gamesChessTournamentNameRequired", values: {} });
      return;
    }

    const normalizedUsername = nextUsername.toLocaleLowerCase();
    const hasDuplicate = tournamentPlayers.some((player) => player.normalizedUsername === normalizedUsername);

    if (hasDuplicate) {
      setTournamentNotice({ key: "gamesChessTournamentDuplicate", values: {} });
      return;
    }

    setTournamentPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: `${normalizedUsername}-${currentPlayers.length + 1}`,
        username: nextUsername,
        normalizedUsername,
      },
    ]);
    setTournamentUsername("");
    setTournamentNotice({ key: "gamesChessTournamentAdded", values: { name: nextUsername } });
  }

  async function handleInviteTournamentMember() {
    if (!user?.uid) {
      setTournamentNotice({ key: "gamesChessTournamentInviteLoginRequired", values: {} });
      return;
    }

    if (!selectedTournamentInviteId) {
      setTournamentNotice({ key: "gamesChessTournamentInviteEmpty", values: {} });
      return;
    }

    if (!selectedTournamentInviteMember) {
      setTournamentNotice({ key: "gamesChessTournamentInviteEmpty", values: {} });
      return;
    }

    if (!isEligibleChessOpponent(selectedTournamentInviteMember)) {
      setTournamentNotice({ key: "gamesChessPlatformInviteRestrictedOpponent", values: {} });
      return;
    }

    const invitedName = getPlatformMemberName(selectedTournamentInviteMember);
    const normalizedInvitedName = invitedName.toLocaleLowerCase();
    const hasDuplicate = tournamentPlayers.some((player) => (
      player.normalizedUsername === normalizedInvitedName
      || (selectedTournamentInviteMember.id && player.userId === selectedTournamentInviteMember.id)
    ));

    if (hasDuplicate) {
      setTournamentNotice({ key: "gamesChessTournamentDuplicate", values: {} });
      return;
    }

    try {
      await ensureSharedChessInvite(selectedTournamentInviteMember);

      setTournamentPlayers((currentPlayers) => [
        ...currentPlayers,
        {
          id: `member-${selectedTournamentInviteMember.id}`,
          username: invitedName,
          normalizedUsername: normalizedInvitedName,
          userId: selectedTournamentInviteMember.id,
          invitedOnline: true,
        },
      ]);
      setTournamentNotice({ key: "gamesChessTournamentInviteSent", values: { name: invitedName } });
      notifySystem(t("gamesChessTournamentInviteMember"), t("gamesChessTournamentInviteSent", { name: invitedName }), "/games");
    } catch (error) {
      trackError(error, {
        scope: "games_invite_tournament_member",
        selectedTournamentInviteId,
        uid: user.uid,
      });
      setTournamentNotice({ key: getChessInviteNoticeKeyFromError(error), values: {} });
    }
  }

  function handleTournamentStart() {
    if (!tournamentCanStart) {
      setTournamentNotice({ key: "gamesChessTournamentNeedPlayers", values: {} });
      return;
    }

    resetChessBoard();
    setTournamentTimeLeft(CHESS_TOURNAMENT_ROUND_SECONDS);
    setIsTournamentRunning(true);
    setChessBoardMessage(t("gamesChessTournamentRunning"));
    setTournamentNotice({ key: "gamesChessTournamentRunning", values: {} });
  }

  function handleTournamentPause() {
    setIsTournamentRunning(false);
    setChessBoardMessage(t("gamesChessTournamentStartPrompt"));
    setTournamentNotice({ key: "gamesChessTournamentPaused", values: {} });
  }

  function handleTournamentResume() {
    if (!tournamentCanStart) {
      setTournamentNotice({ key: "gamesChessTournamentNeedPlayers", values: {} });
      return;
    }

    if (tournamentTimeLeft === 0) {
      setTournamentTimeLeft(CHESS_TOURNAMENT_ROUND_SECONDS);
    }

    setIsTournamentRunning(true);
    setChessBoardMessage(t("gamesChessTournamentResumed"));
    setTournamentNotice({ key: "gamesChessTournamentResumed", values: {} });
  }

  function handleTournamentReset() {
    resetChessBoard();
    setIsTournamentRunning(false);
    setTournamentTimeLeft(CHESS_TOURNAMENT_ROUND_SECONDS);
    setChessBoardMessage(t("gamesChessTournamentResetMessage"));
    setTournamentNotice({ key: "gamesChessTournamentResetMessage", values: {} });
  }

  function getChessPieceLabel(piece) {
    return piece ? chessPieceLabels[piece.type] : "";
  }

  function isLegalChessMove(row, col) {
    return legalChessMoves.some((move) => move.row === row && move.col === col);
  }

  async function handleChessBoardSquareClick(row, col) {
    if (isChessMoveSyncing || chessGameOver || chessIsPaused || isAIThinking) {
      return;
    }

    if (chessPlayMode === "tournament" && !isTournamentRunning) {
      setChessBoardMessage(t(tournamentTimeLeft === 0 ? "gamesChessTournamentTimeUp" : "gamesChessTournamentStartPrompt"));
      return;
    }

    if (isPlatformChessActive && activeSharedChessPlayerColor && chessTurn !== activeSharedChessPlayerColor) {
      setChessBoardMessage(t("gamesChessPlatformWaitTurn"));
      return;
    }

    const clickedPiece = chessBoard[row][col];

    if (!selectedBoardSquare) {
      if (!clickedPiece || clickedPiece.color !== chessTurn) {
        setChessBoardMessage(t("gamesChessBoardHelp"));
        return;
      }

      const nextMoves = getLegalChessMoves(chessBoard, row, col);
      setSelectedBoardSquare({ row, col });
      setLegalChessMoves(nextMoves);
      setChessBoardMessage(
        nextMoves.length > 0
          ? t("gamesChessBoardSelected", { piece: getChessPieceLabel(clickedPiece) })
          : t("gamesChessBoardNoMoves")
      );
      return;
    }

    const isSameSquare = selectedBoardSquare.row === row && selectedBoardSquare.col === col;
    if (isSameSquare) {
      setSelectedBoardSquare(null);
      setLegalChessMoves([]);
      setChessBoardMessage(t("gamesChessBoardHelp"));
      return;
    }

    if (isLegalChessMove(row, col)) {
      const previousBoard = cloneChessBoard(chessBoard);
      const previousTurn = chessTurn;
      const previousLastMove = lastChessMove;
      const previousBoardMessage = chessBoardMessage;
      const moveFrom = { row: selectedBoardSquare.row, col: selectedBoardSquare.col };
      const nextBoard = cloneChessBoard(chessBoard);
      const movingPiece = nextBoard[moveFrom.row][moveFrom.col];
      const capturedPiece = nextBoard[row][col];
      const movedPiece = movingPiece.type === "pawn" && (row === 0 || row === 7) ? { ...movingPiece, type: "queen" } : movingPiece;
      const nextTurn = chessTurn === "white" ? "black" : "white";
      const nextLastMove = { from: moveFrom, to: { row, col } };

      nextBoard[row][col] = movedPiece;
      nextBoard[moveFrom.row][moveFrom.col] = null;

      const baseBoardMessage =
        capturedPiece
          ? t("gamesChessBoardCapture", { piece: getChessPieceLabel(capturedPiece) })
          : t("gamesChessBoardMoved", { piece: getChessPieceLabel(movedPiece), square: toChessSquare(row, col) });

      const opponentInCheck = isKingInCheck(nextBoard, nextTurn);
      const opponentHasMoves = hasAnyLegalMoves(nextBoard, nextTurn);
      let gameStatus = "active";
      let finalBoardMessage = baseBoardMessage;

      if (!opponentHasMoves) {
        if (opponentInCheck) {
          gameStatus = "checkmate";
          finalBoardMessage = t("gamesChessBoardCheckmate", { color: t(chessTurn === "white" ? "gamesChessBoardWhite" : "gamesChessBoardBlack") });
          setChessGameOver(true);
          setChessGameResult("checkmate");
        } else {
          gameStatus = "stalemate";
          finalBoardMessage = t("gamesChessBoardStalemate");
          setChessGameOver(true);
          setChessGameResult("stalemate");
        }
      } else if (opponentInCheck) {
        gameStatus = "check";
        finalBoardMessage = t("gamesChessBoardCheck");
      }

      setChessBoard(nextBoard);
      setLastChessMove(nextLastMove);
      setSelectedBoardSquare(null);
      setLegalChessMoves([]);
      setChessTurn(nextTurn);
      setChessBoardMessage(finalBoardMessage);

      if (isPlatformChessActive && activeSharedChessGameId) {
        setIsChessMoveSyncing(true);
        try {
          await commitChessGameMove(activeSharedChessGameId, {
            board: nextBoard,
            expectedBoard: previousBoard,
            turn: nextTurn,
            lastMove: nextLastMove,
            boardMessage: "",
            status: gameStatus,
          });
        } catch (error) {
          trackError(error, {
            scope: "games_commit_platform_chess_move",
            gameId: activeSharedChessGameId,
            uid: user?.uid || "",
          });
          setChessBoard(previousBoard);
          setChessTurn(previousTurn);
          setLastChessMove(previousLastMove || null);
          setChessBoardMessage(previousBoardMessage || t("gamesChessBoardHelp"));
          setChessGameOver(false);
          setChessGameResult(null);
          setPlatformNotice({
            key: getChessMoveNoticeKeyFromError(error),
            values: {},
            detail: getChessInviteDebugDetail(error),
          });
        } finally {
          setIsChessMoveSyncing(false);
        }
      }

      return;
    }

    if (clickedPiece && clickedPiece.color === chessTurn) {
      const nextMoves = getLegalChessMoves(chessBoard, row, col);
      setSelectedBoardSquare({ row, col });
      setLegalChessMoves(nextMoves);
      setChessBoardMessage(
        nextMoves.length > 0
          ? t("gamesChessBoardSelected", { piece: getChessPieceLabel(clickedPiece) })
          : t("gamesChessBoardNoMoves")
      );
      return;
    }

    setSelectedBoardSquare(null);
    setLegalChessMoves([]);
    setChessBoardMessage(t("gamesChessBoardHelp"));
  }

  function resetQuizGame() {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedQuizOption(null);
    setQuizFeedback("idle");
    setQuizCompleted(false);
  }

  function handleCardClick(card) {
    if (isChecking || card.matched || card.revealed || selectedCards.length === 2) {
      return;
    }

    const nextSelected = [...selectedCards, card.id];
    const nextCards = memoryCards.map((item) => (item.id === card.id ? { ...item, revealed: true } : item));

    setMemoryCards(nextCards);
    setSelectedCards(nextSelected);

    if (nextSelected.length !== 2) {
      return;
    }

    setIsChecking(true);
    setMemoryMoves((prev) => prev + 1);

    const firstCard = nextCards.find((item) => item.id === nextSelected[0]);
    const secondCard = nextCards.find((item) => item.id === nextSelected[1]);
    const isMatch = firstCard && secondCard && firstCard.pairId === secondCard.pairId;

    window.setTimeout(() => {
      setMemoryCards((currentCards) =>
        currentCards.map((item) => {
          if (item.id !== nextSelected[0] && item.id !== nextSelected[1]) {
            return item;
          }

          if (isMatch) {
            return { ...item, matched: true, revealed: true };
          }

          return { ...item, revealed: false };
        })
      );
      setSelectedCards([]);
      setIsChecking(false);
    }, 650);
  }

  function handleEmotionAnswer(emotionId) {
    if (selectedEmotion !== null || emotionCompleted) {
      return;
    }

    const isCorrect = emotionId === currentEmotion.correctEmotion;
    setSelectedEmotion(emotionId);
    setEmotionFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setEmotionScore((prev) => prev + 1);
    }
  }

  function handleNextEmotionCard() {
    if (emotionIndex === emotionScenarios.length - 1) {
      setEmotionCompleted(true);
      return;
    }

    setEmotionIndex((prev) => prev + 1);
    setSelectedEmotion(null);
    setEmotionFeedback("idle");
  }

  function handleChessAnswer(pieceId) {
    if (selectedChessPiece !== null || chessCompleted) {
      return;
    }

    const isCorrect = pieceId === currentChessChallenge.correctPiece;
    setSelectedChessPiece(pieceId);
    setChessFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setChessScore((prev) => prev + 1);
    }
  }

  function handleNextChessChallenge() {
    if (chessIndex === chessChallenges.length - 1) {
      setChessCompleted(true);
      return;
    }

    setChessIndex((prev) => prev + 1);
    setSelectedChessPiece(null);
    setChessFeedback("idle");
  }

  function handleQuizAnswer(optionIndex) {
    if (selectedQuizOption !== null || quizCompleted) {
      return;
    }

    const isCorrect = optionIndex === currentQuiz.correctIndex;
    setSelectedQuizOption(optionIndex);
    setQuizFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }
  }

  function handleNextQuizStep() {
    if (quizIndex === quizQuestions.length - 1) {
      setQuizCompleted(true);
      return;
    }

    setQuizIndex((prev) => prev + 1);
    setSelectedQuizOption(null);
    setQuizFeedback("idle");
  }

  return (
    <div className="space-y-10">
      <Card className="overflow-hidden rounded-[2rem] border border-rose-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,241,242,0.98)_100%)] shadow-[0_30px_80px_-52px_rgba(190,24,93,0.18)] sm:rounded-[2.75rem]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22)_0%,_transparent_30%),linear-gradient(135deg,_#7f1d1d_0%,_#dc2626_52%,_#f97316_100%)] p-5 text-white sm:p-8 md:p-10">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-12 top-4 h-36 w-36 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-rose-200 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-orange-200 blur-3xl" />
          </div>
          <div className="relative space-y-6">
            <div className="grid gap-8 xl:grid-cols-[1.05fr,0.95fr] xl:items-start">
              <div>
              <Badge className="rounded-full border border-white/20 bg-white/14 px-4 py-1.5 text-white hover:bg-white/14">
                <Gamepad2 className="mr-2 h-3.5 w-3.5" />
                {t("gamesKidsBadge")}
              </Badge>
              <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl xl:text-[2.8rem]">
                {t("gamesTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                {t("gamesDesc")}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {heroHighlights.map((highlight) => (
                  <span key={highlight} className="rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
                    {highlight}
                  </span>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#games-playground" className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-[#7f1d1d] shadow-sm transition-transform hover:scale-[1.02] sm:w-auto">
                  {t("gamesHeroJumpToGames")}
                </a>
              </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-white/35 bg-white/18 p-4 backdrop-blur-md">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">{t("gamesStatsAvailable")}</div>
                  <div className="mt-2 text-2xl font-bold text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.2)] sm:text-3xl">{availableGamesCount}</div>
                </div>
                <div className="rounded-[1.75rem] border border-white/35 bg-white/18 p-4 backdrop-blur-md">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">{t("gamesStatsMemory")}</div>
                  <div className="mt-2 text-2xl font-bold text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.2)] sm:text-3xl">{matchedPairs}/{MEMORY_EMOJIS.length}</div>
                </div>
                <div className="rounded-[1.75rem] border border-white/35 bg-white/18 p-4 backdrop-blur-md">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">{t("gamesStatsEmotion")}</div>
                  <div className="mt-2 text-2xl font-bold text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.2)] sm:text-3xl">
                    {emotionCompleted ? emotionScenarios.length : emotionIndex + (selectedEmotion !== null ? 1 : 0)}/{emotionScenarios.length}
                  </div>
                </div>
                <div className="rounded-[1.75rem] border border-white/35 bg-white/18 p-4 backdrop-blur-md">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">{t("gamesStatsQuiz")}</div>
                  <div className="mt-2 text-2xl font-bold text-white [text-shadow:0_2px_12px_rgba(15,23,42,0.2)] sm:text-3xl">{quizScore}/{quizQuestions.length}</div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.2rem] border border-white/30 bg-white/12 backdrop-blur-md shadow-[0_24px_48px_-30px_rgba(69,10,10,0.45)]">
              <div className="grid xl:grid-cols-[1.28fr,0.72fr]">
                <div className="relative">
                  <Image
                    src="/jeux%20echec.png"
                    alt={t("gamesChessTitle")}
                    width={1600}
                    height={900}
                    priority
                    className="h-[240px] w-full object-cover object-[center_70%] sm:h-[400px] xl:h-[460px]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(127,29,29,0.04)_0%,_rgba(127,29,29,0.14)_100%)]" />
                  <div className="absolute left-4 top-4">
                    <Badge className="rounded-full border border-white/25 bg-black/20 text-white hover:bg-black/20">
                      {t("gamesChessBadge")}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-4 bg-[linear-gradient(180deg,_rgba(255,255,255,0.12)_0%,_rgba(127,29,29,0.16)_100%)] px-5 py-5 sm:px-6 sm:py-6">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-white/75">{t("gamesVisionBadge")}</div>
                    <div className="mt-2 text-xl font-semibold text-white sm:text-2xl">{t("gamesChessTitle")}</div>
                  </div>
                  <p className="max-w-md text-sm leading-7 text-white/82 sm:text-base">{t("gamesUniverseChessDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section id="games-playground" className="space-y-6">
        <div className="max-w-3xl">
          <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {t("gamesUniverseStatusAvailable")}
          </Badge>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{t("gamesPlaygroundTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{t("gamesPlaygroundDesc")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr,1fr,0.92fr]">
          {featuredPlaygroundZones.map((zone) => {
            const Icon = zone.icon;

            return (
              <a
                key={zone.id}
                href={zone.href}
                className={`group rounded-[2rem] border p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_58px_-36px_rgba(15,23,42,0.3)] sm:p-6 ${zone.cardClassName}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${zone.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className={`rounded-full border-0 hover:opacity-100 ${zone.metaClassName}`}>
                    {zone.badge}
                  </Badge>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="text-xl font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-slate-950">{zone.title}</div>
                  <p className="text-sm leading-7 text-slate-600">{zone.description}</p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                    {zone.meta}
                  </span>
                  <span className="inline-flex items-center text-sm font-semibold text-slate-800">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </a>
            );
          })}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.22)] md:col-span-2 sm:p-6 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
                {t("gamesUniverseStatusAvailable")}
              </Badge>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">{availableGamesCount}</div>
            </div>

            <div className="mt-5 space-y-3">
              {compactPlaygroundLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/80 px-3.5 py-3.5 transition-all hover:border-cyan-200 hover:bg-white sm:gap-4 sm:px-4 sm:py-4"
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <Card id="chess-game" className="overflow-hidden rounded-[2rem] border border-rose-100 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(255,241,242,0.98)_100%)] shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="rounded-full bg-rose-100 text-rose-700 hover:bg-rose-100">
                  {t("gamesChessBadge")}
                </Badge>
                <CardTitle className="mt-4 flex items-center gap-2 text-xl text-slate-900">
                  <Trophy className="h-5 w-5 text-rose-600" />
                  {t("gamesChessTitle")}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {t("gamesChessDesc")}
                </CardDescription>
              </div>
              <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                {t("gamesChessScore")} {chessScore}/{chessChallenges.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{t("gamesChessBoardTitle")}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{t("gamesChessBoardDesc")}</p>
                </div>
                <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                  {t("gamesChessBoardTurn")} {t(chessTurn === "white" ? "gamesChessBoardWhite" : "gamesChessBoardBlack")}
                </Badge>
              </div>

              <div className="rounded-[1.6rem] border border-rose-100 bg-[linear-gradient(135deg,_rgba(255,250,250,0.98)_0%,_rgba(255,241,242,0.98)_100%)] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessModeLabel")}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {chessPlayModes.map((mode) => {
                    const isSelected = chessPlayMode === mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setChessPlayMode(mode.id)}
                        className={`rounded-[1.35rem] border px-4 py-4 text-left transition-all ${isSelected ? "border-rose-300 bg-rose-50 shadow-[0_14px_24px_-20px_rgba(225,29,72,0.32)]" : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/70"}`}
                      >
                        <div className={`text-sm font-semibold ${isSelected ? "text-rose-800" : "text-slate-900"}`}>{mode.title}</div>
                        <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-rose-700" : "text-slate-600"}`}>{mode.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {chessPlayMode === "solo" ? (
                <div className="rounded-[1.6rem] border border-amber-100 bg-[linear-gradient(135deg,_rgba(255,251,235,0.98)_0%,_rgba(255,255,255,0.98)_100%)] p-5 shadow-[0_16px_32px_-26px_rgba(245,158,11,0.18)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{language === "ht" ? "Nivo difikilte" : "Niveau de difficulté"}</h4>
                      <p className="mt-1 text-sm text-slate-500">{language === "ht" ? "Chwazi ki jan IA a ka fò" : "Choisissez la force de l'IA"}</p>
                    </div>
                    {isAIThinking && (
                      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                        {language === "ht" ? "IA ap réfléchi" : "L'IA réfléchit"}
                        <span className="tabular-nums">{aiThinkingElapsed}s</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { id: "easy", label: language === "ht" ? "Fasil" : "Facile", desc: language === "ht" ? "Bon pou debitan" : "Pour débutants", color: "emerald" },
                      { id: "medium", label: language === "ht" ? "Mwayen" : "Moyen", desc: language === "ht" ? "Yon bon defi" : "Un bon défi", color: "amber" },
                      { id: "hard", label: language === "ht" ? "Difisil" : "Difficile", desc: language === "ht" ? "Pou ekspè" : "Pour experts", color: "rose" },
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        disabled={isAIThinking}
                        onClick={() => setAiDifficulty(level.id)}
                        className={`rounded-[1.2rem] border px-3 py-3 text-left transition-all ${
                          aiDifficulty === level.id
                            ? level.color === "emerald" ? "border-emerald-300 bg-emerald-50 shadow-sm" : level.color === "amber" ? "border-amber-300 bg-amber-50 shadow-sm" : "border-rose-300 bg-rose-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className={`text-sm font-semibold ${
                          aiDifficulty === level.id
                            ? level.color === "emerald" ? "text-emerald-800" : level.color === "amber" ? "text-amber-800" : "text-rose-800"
                            : "text-slate-700"
                        }`}>{level.label}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {chessPlayMode === "duel" ? (
                <div className="rounded-[1.6rem] border border-rose-100 bg-white p-5 shadow-[0_16px_32px_-26px_rgba(225,29,72,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{t("gamesChessPlatformTitle")}</h4>
                      <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{t("gamesChessPlatformDesc")}</p>
                    </div>
                    {isPlatformChessActive && activeSharedChessOpponentName ? (
                      <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
                        {t("gamesChessPlatformActiveWith", { name: activeSharedChessOpponentName })}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {platformNoticeLabel}
                    {platformNoticeDetail ? (
                      <div className="mt-2 break-words text-xs font-medium text-rose-900/80">
                        {platformNoticeDetail}
                      </div>
                    ) : null}
                  </div>

                  {!user ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      {t("gamesChessPlatformLoginRequired")}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessPlatformPlayersLabel")}</div>
                        {discoverableUsersLoading ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">...</div>
                        ) : discoverableUsers.length > 0 ? (
                          <>
                            <Input
                              type="text"
                              value={opponentSearch}
                              onChange={(e) => setOpponentSearch(e.target.value)}
                              placeholder={t("gamesChessPlatformSearchPlaceholder")}
                              className="mt-3 rounded-2xl border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:ring-rose-400"
                            />
                            {(() => {
                              const filtered = discoverableUsers.filter((u) => {
                                if (!opponentSearch.trim()) return true;
                                return getPlatformMemberName(u).toLowerCase().includes(opponentSearch.trim().toLowerCase());
                              });
                              return filtered.length > 0 ? (
                                <div className="mt-3 grid max-h-[26rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                                  {filtered.map((member) => {
                                    const isSelected = selectedChessOpponentId === member.id;
                                    const isOnline = !!chessOnlineUsers[member.id];
                                    return (
                                      <button
                                        key={member.id}
                                        type="button"
                                        onClick={() => setSelectedChessOpponentId(member.id)}
                                        className={`min-w-0 rounded-[1.35rem] border px-4 py-4 text-left transition-all ${isSelected ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/70"}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isOnline ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="En ligne" /> : <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />}
                                          <span className="break-words text-sm font-semibold text-slate-900">{getPlatformMemberName(member)}</span>
                                        </div>
                                        <div className="mt-1 break-all text-xs leading-5 text-slate-500">{isOnline ? "En ligne · " : ""}{member.city || member.country || member.email || "Lakou Manman"}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                  {t("gamesChessPlatformPlayersEmpty")}
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            {t("gamesChessPlatformPlayersEmpty")}
                          </div>
                        )}
                      </div>

                      {(() => {
                        const finishedStatuses = ["checkmate", "stalemate", "resigned"];
                        const hasActiveGameWithOther = userChessGames.some((game) => {
                          const status = String(game.status || "").toLowerCase();
                          if (finishedStatuses.includes(status)) return false;
                          const opp = game.participants?.find((p) => p !== user?.uid);
                          return opp && opp !== selectedChessOpponentId;
                        });
                        return (
                          <div className="space-y-3">
                            {hasActiveGameWithOther ? (
                              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                                <span className="mt-0.5 shrink-0">🔒</span>
                                <span>{t("gamesChessPlatformAlreadyActive")}</span>
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              className={`rounded-2xl text-white hover:opacity-95 ${hasActiveGameWithOther ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-rose-500 to-orange-500"}`}
                              onClick={handleCreatePlatformChessGame}
                            >
                              {t("gamesChessPlatformInvite")}
                            </Button>
                            {!hasActiveGameWithOther ? (
                              <p className="text-xs leading-5 text-slate-500">{t("gamesChessPlatformJoinFlow")}</p>
                            ) : null}
                          </div>
                        );
                      })()}

                      {userChessGames.length > 0 ? (
                        <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessPlatformGamesTitle")}</div>
                          <div className="mt-3 space-y-2">
                            {(() => {
                              const finishedStatuses = ["checkmate", "stalemate", "resigned"];
                              const seen = new Set();
                              return userChessGames
                                .filter((game) => {
                                  const status = String(game.status || "").toLowerCase();
                                  if (finishedStatuses.includes(status)) return false;
                                  const oppId = game.participants?.find((p) => p !== user?.uid) || game.id;
                                  if (seen.has(oppId)) return false;
                                  seen.add(oppId);
                                  return true;
                                })
                                .slice(0, 6)
                                .map((game) => {
                                  const isActive = game.id === activeSharedChessGameId;
                                  const opponentName = getChessGameOpponentName(game) || "Joueur";
                                  const iAmHost = game.hostId === user?.uid;
                                  const colorLabel = iAmHost ? t("gamesChessPlatformYouWhite") : t("gamesChessPlatformYouBlack");
                                  return (
                                    <div
                                      key={game.id}
                                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
                                        isActive
                                          ? "border-rose-200 bg-rose-50 shadow-[0_8px_20px_-14px_rgba(225,29,72,0.28)]"
                                          : "border-white bg-white shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)]"
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          {isActive ? (
                                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                                          ) : null}
                                          <span className={`text-sm font-semibold ${isActive ? "text-rose-900" : "text-slate-900"}`}>{opponentName}</span>
                                        </div>
                                        <div className={`mt-0.5 text-xs leading-5 ${isActive ? "text-rose-600" : "text-slate-400"}`}>{colorLabel}</div>
                                      </div>
                                      <Button
                                        type="button"
                                        className={isActive ? "rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95" : "rounded-2xl border-slate-200 text-slate-700"}
                                        variant={isActive ? "default" : "outline"}
                                        onClick={() => handleOpenSharedChessGame(game.id)}
                                      >
                                        {isActive ? t("gamesChessPlatformPlay") : t("gamesChessPlatformOpen")}
                                      </Button>
                                    </div>
                                  );
                                });
                            })()}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {chessPlayMode === "tournament" ? (
                <div className="rounded-[1.6rem] border border-rose-100 bg-white p-5 shadow-[0_16px_32px_-26px_rgba(225,29,72,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{t("gamesChessTournamentPanelTitle")}</h4>
                      <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{t("gamesChessTournamentPanelDesc")}</p>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tournamentTimeLeft <= 30 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                      <Clock3 className="h-4 w-4" />
                      <span>{t("gamesChessTournamentTimer")} {tournamentTimerLabel}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessTournamentNameLabel")}</div>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                          <Input
                            type="text"
                            value={tournamentUsername}
                            onChange={(event) => setTournamentUsername(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleTournamentRegistration();
                              }
                            }}
                            placeholder={resolvedTournamentUsername || t("gamesChessTournamentNamePlaceholder")}
                            className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-500"
                          />
                          <Button type="button" variant="outline" className="h-11 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleTournamentRegistration}>
                            {t("gamesChessTournamentAddPlayer")}
                          </Button>
                        </div>
                        {resolvedTournamentUsername ? (
                          <p className="mt-2 text-xs leading-6 text-slate-500">{t("gamesChessTournamentCurrentUserHint", { name: resolvedTournamentUsername })}</p>
                        ) : null}
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessTournamentInviteMembersLabel")}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{t("gamesChessTournamentInviteMembersDesc")}</p>
                        {!user ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            {t("gamesChessTournamentInviteLoginRequired")}
                          </div>
                        ) : discoverableUsersLoading ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">...</div>
                        ) : discoverableUsers.length > 0 ? (
                          <>
                            <div className="mt-3 grid max-h-[22rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                              {discoverableUsers.map((member) => {
                                const isSelected = selectedTournamentInviteId === member.id;
                                return (
                                  <button
                                    key={`tournament-${member.id}`}
                                    type="button"
                                    onClick={() => setSelectedTournamentInviteId(member.id)}
                                    className={`min-w-0 rounded-[1.35rem] border px-4 py-4 text-left transition-all ${isSelected ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/70"}`}
                                  >
                                    <div className="break-words text-sm font-semibold text-slate-900">{getPlatformMemberName(member)}</div>
                                    <div className="mt-1 break-all text-xs leading-5 text-slate-500">{member.city || member.country || member.email || "Lakou Manman"}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <Button type="button" variant="outline" className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleInviteTournamentMember}>
                                {t("gamesChessTournamentInviteMember")}
                              </Button>
                              <span className="text-sm text-slate-500">{t("gamesChessTournamentInviteMembersHint")}</span>
                            </div>
                          </>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                            {t("gamesChessTournamentInviteEmpty")}
                          </div>
                        )}
                      </div>

                      <div className={`rounded-2xl px-4 py-3 text-sm ${tournamentNoticeIsWarning ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                        {tournamentNoticeLabel}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {isTournamentRunning ? (
                          <Button type="button" className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95" onClick={handleTournamentPause}>
                            {t("gamesChessTournamentPause")}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95"
                            onClick={tournamentHasStarted && tournamentTimeLeft > 0 ? handleTournamentResume : handleTournamentStart}
                          >
                            {tournamentHasStarted && tournamentTimeLeft > 0 ? t("gamesChessTournamentResume") : t("gamesChessTournamentStart")}
                          </Button>
                        )}
                        <Button type="button" variant="outline" className="rounded-2xl border-slate-300 text-slate-700" onClick={handleTournamentReset}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t("gamesChessTournamentReset")}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessTournamentParticipants")}</div>
                          <div className="mt-2 text-2xl font-semibold text-slate-900">{tournamentPlayers.length}</div>
                        </div>
                        <Badge className="rounded-full bg-white text-slate-700 hover:bg-white">
                          {t("gamesChessTournamentTimer")} {tournamentTimerLabel}
                        </Badge>
                      </div>

                      <div className="mt-4 flex min-h-16 flex-wrap gap-2">
                        {tournamentPlayers.length > 0 ? (
                          tournamentPlayers.map((player) => (
                            <span key={player.id} className="rounded-full border border-rose-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_12px_24px_-20px_rgba(225,29,72,0.16)]">
                              {player.username}
                              {player.invitedOnline ? (
                                <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-rose-600">{t("gamesChessTournamentParticipantInvitedBadge")}</span>
                              ) : null}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm leading-7 text-slate-500">{t("gamesChessTournamentParticipantsEmpty")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div id="chess-board-area" className="grid gap-5 xl:grid-cols-[minmax(0,1fr),22rem] xl:items-start">
                <div className="space-y-5">
                  {chessGameOver ? (
                    <div className={`rounded-[1.5rem] border px-5 py-4 ${chessGameResult === "checkmate" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${chessGameResult === "checkmate" ? "text-rose-500" : "text-slate-500"}`}>{t("gamesChessBoardGameOver")}</div>
                          <p className="mt-1 text-sm font-medium text-slate-900">{currentBoardMessage}</p>
                        </div>
                        <Button type="button" className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95" onClick={isPlatformChessActive ? handleResetSharedChessGame : resetChessBoard}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t("gamesChessBoardReset")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <div className="rounded-[1.9rem] border border-[#c5a37f] bg-[linear-gradient(145deg,_#98704a_0%,_#b88d62_44%,_#886040_100%)] p-2 shadow-[0_24px_50px_-28px_rgba(64,40,18,0.54),inset_0_1px_0_rgba(255,255,255,0.16)] sm:p-3 md:p-4">
                    <div className="rounded-[1.55rem] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16)_0%,_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(62,32,10,0.16)_0%,_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.06)_0%,_rgba(34,20,9,0.08)_100%)] p-1.5 sm:p-2 md:p-2.5">
                      <div className="grid grid-cols-8 overflow-hidden rounded-[1.35rem] border border-[#ceb89f] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_30px_-26px_rgba(60,35,14,0.58)]">
                        {(() => {
                          const isBoardFlipped = isPlatformChessActive && activeSharedChessPlayerColor === "black";
                          const kingCheckPos = isKingInCheck(chessBoard, chessTurn) ? findKingPosition(chessBoard, chessTurn) : null;
                          const displayBoard = isBoardFlipped
                            ? [...chessBoard].reverse().map((row) => [...row].reverse())
                            : chessBoard;
                          return displayBoard.map((row, vRow) =>
                            row.map((piece, vCol) => {
                              const actualRow = isBoardFlipped ? (7 - vRow) : vRow;
                              const actualCol = isBoardFlipped ? (7 - vCol) : vCol;
                              const isDarkSquare = (actualRow + actualCol) % 2 === 1;
                              const isSelected = selectedBoardSquare && selectedBoardSquare.row === actualRow && selectedBoardSquare.col === actualCol;
                              const isLegalMoveSquare = isLegalChessMove(actualRow, actualCol);
                              const isLastMoveSquare =
                                (lastChessMove && lastChessMove.from.row === actualRow && lastChessMove.from.col === actualCol) ||
                                (lastChessMove && lastChessMove.to.row === actualRow && lastChessMove.to.col === actualCol);
                              const isKingUnderCheck = kingCheckPos && kingCheckPos.row === actualRow && kingCheckPos.col === actualCol;
                              const rankLabel = isBoardFlipped ? (vRow + 1) : (8 - vRow);
                              const fileLabel = CHESS_FILES[isBoardFlipped ? (7 - vCol) : vCol];

                              return (
                                <button
                                  key={`${actualRow}-${actualCol}`}
                                  type="button"
                                  aria-label={`${toChessSquare(actualRow, actualCol)} ${piece ? getChessPieceLabel(piece) : ""}`.trim()}
                                  onClick={() => handleChessBoardSquareClick(actualRow, actualCol)}
                                  disabled={isChessMoveSyncing || chessGameOver}
                                  className={`group relative flex aspect-square items-center justify-center overflow-hidden text-[1.25rem] transition-all hover:z-10 active:scale-[0.98] sm:text-[2.2rem] ${isDarkSquare ? "bg-[linear-gradient(135deg,_#b08a62_0%,_#bf9970_52%,_#9f7853_100%)]" : "bg-[linear-gradient(135deg,_#ebdcc4_0%,_#e3d0b4_54%,_#d5bb95_100%)]"} ${isSelected ? "ring-2 ring-inset ring-violet-600/75" : ""} ${isLastMoveSquare ? "shadow-[inset_0_0_0_9999px_rgba(255,221,128,0.07)]" : ""} ${isKingUnderCheck ? "shadow-[inset_0_0_0_9999px_rgba(220,38,38,0.32)]" : ""} ${isChessMoveSyncing || chessGameOver ? "cursor-not-allowed" : ""}`}
                                >
                                  {vCol === 0 ? <span className={`absolute left-1 top-1 text-[9px] font-semibold sm:left-1.5 sm:text-[10px] ${isDarkSquare ? "text-white/55" : "text-[#7d5b39]/65"}`}>{rankLabel}</span> : null}
                                  {vRow === 7 ? <span className={`absolute bottom-1 right-1 text-[9px] font-semibold sm:right-1.5 sm:text-[10px] ${isDarkSquare ? "text-white/55" : "text-[#7d5b39]/65"}`}>{fileLabel}</span> : null}
                                  {piece ? (
                                    <ChessPieceGlyph piece={piece} sizeClassName={piece.type === "pawn" ? "text-[1.3rem] sm:text-[2.95rem]" : "text-[1.1rem] sm:text-[2.6rem]"} />
                                  ) : null}
                                  {isLegalMoveSquare && !piece ? <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500/55" /> : null}
                                  {isLegalMoveSquare && piece ? <span className="absolute inset-2.5 rounded-full ring-2 ring-emerald-500/45" /> : null}
                                </button>
                              );
                            })
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.88fr)]">
                    <div className="rounded-[1.85rem] border border-rose-100 bg-[linear-gradient(135deg,_rgba(255,250,250,0.98)_0%,_rgba(255,242,244,0.96)_48%,_rgba(255,247,237,0.98)_100%)] p-5 shadow-[0_24px_40px_-30px_rgba(225,29,72,0.26)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-[0_16px_28px_-20px_rgba(225,29,72,0.38)]">
                            <Brain className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-rose-500">{t("gamesChessChallengeTitle")}</div>
                            <div className="mt-1 text-sm font-medium text-slate-600">{t("gamesChessChallengeDesc")}</div>
                          </div>
                        </div>
                        <Badge className="rounded-full bg-white text-rose-700 shadow-sm hover:bg-white">
                          {t("gamesChessProgress")} {chessChallengeProgressLabel}
                        </Badge>
                      </div>

                      <div className="mt-5 rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_28px_-24px_rgba(15,23,42,0.15)]">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <Rocket className="h-4 w-4 text-rose-500" />
                          {t("gamesChessModeActive")}
                        </div>
                        <p className="mt-3 text-lg font-semibold leading-8 text-slate-900">{chessCoachObjective}</p>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{selectedChessPlayMode.description}</p>
                      </div>

                      <div className={`mt-4 rounded-[1.6rem] border px-5 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.16)] ${chessCoachTipClassName}`}>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                          <Sparkles className="h-4 w-4" />
                          {t("gamesChessHintLabel")}
                        </div>
                        <p className="mt-3 text-sm leading-7">{chessMessage}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      {chessCoachHighlights.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div key={item.id} className={`rounded-[1.45rem] border px-4 py-4 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.14)] ${item.className}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_20px_-18px_rgba(15,23,42,0.35)]">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{item.label}</div>
                                <div className="mt-1 text-sm font-semibold leading-6 text-slate-900">{item.value}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[#dcc3a7] bg-[linear-gradient(135deg,_rgba(252,248,241,0.98)_0%,_rgba(244,231,210,0.98)_54%,_rgba(231,211,181,0.98)_100%)] p-5 text-slate-900 shadow-[0_18px_30px_-24px_rgba(120,84,42,0.22)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-[#8a6440]">{t("gamesUniverseChessTitle")}</div>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-[#7c5b3e]">{currentBoardMessage}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="rounded-full bg-white/90 text-[#8a6440] shadow-sm hover:bg-white/90">
                          {selectedChessPlayMode.title}
                        </Badge>
                        <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                          {t(chessTurn === "white" ? "gamesChessBoardWhite" : "gamesChessBoardBlack")}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {chessPieces.map((piece) => (
                        <div key={piece.id} className="rounded-2xl border border-[#e0c6a6] bg-[linear-gradient(180deg,_rgba(255,255,255,0.88)_0%,_rgba(248,239,226,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_28px_-24px_rgba(95,64,30,0.35)]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(241,228,207,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_22px_-18px_rgba(95,64,30,0.45)]">
                            <ChessPieceGlyph piece={{ color: "white", type: piece.id, symbol: piece.symbol }} sizeClassName="text-[2.15rem]" />
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-800">{piece.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_28px_-24px_rgba(95,64,30,0.28)]">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#8a6440]">{t("gamesChessBoardPiece")}</div>
                        <div className="mt-2 text-base font-semibold text-slate-900">{selectedBoardPiece ? getChessPieceLabel(selectedBoardPiece) : t("gamesChessBoardNone")}</div>
                      </div>
                      <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-[0_14px_28px_-24px_rgba(95,64,30,0.28)]">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#8a6440]">{t("gamesChessBoardLastMove")}</div>
                        <div className="mt-2 text-base font-semibold text-slate-900">{lastChessMoveLabel}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6440]">
                      <span>{t("gamesChessBoardCapturedWhite")} {capturedWhitePieces.length}</span>
                      <span>{t("gamesChessBoardCapturedBlack")} {capturedBlackPieces.length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:sticky xl:top-24">
                  {isPlatformChessActive && activeSharedChessGameId ? (
                    <div className="rounded-[1.6rem] border border-rose-100 bg-white shadow-[0_18px_34px_-30px_rgba(225,29,72,0.18)]">
                      <div className="flex items-center gap-2 border-b border-rose-50 px-4 py-3">
                        <MessageSquare className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-semibold text-slate-900">Chat</span>
                        {activeSharedChessOpponentName ? (
                          <span className="ml-auto truncate text-xs text-slate-500">{activeSharedChessOpponentName}</span>
                        ) : null}
                      </div>
                      <div className="flex h-52 flex-col gap-2 overflow-y-auto px-3 py-3">
                        {chessChatMessages.length === 0 ? (
                          <p className="my-auto text-center text-xs text-slate-400">Aucun message pour l&apos;instant.</p>
                        ) : (
                          chessChatMessages.map((msg) => {
                            const isMe = msg.senderId === user?.uid;
                            return (
                              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-5 ${isMe ? "rounded-br-sm bg-rose-500 text-white" : "rounded-bl-sm bg-slate-100 text-slate-900"}`}>
                                  {msg.text}
                                </span>
                                <span className="mt-1 text-[10px] text-slate-400">{isMe ? "Moi" : msg.senderName}</span>
                              </div>
                            );
                          })
                        )}
                        <div ref={chessChatEndRef} />
                      </div>
                      <form onSubmit={handleSendChessChat} className="flex items-center gap-2 border-t border-rose-50 px-3 py-2">
                        <Input
                          type="text"
                          value={chessChatInput}
                          onChange={(e) => setChessChatInput(e.target.value)}
                          placeholder="Message..."
                          maxLength={500}
                          disabled={chessChatSending}
                          className="h-9 flex-1 rounded-2xl border-slate-200 bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus-visible:ring-rose-400"
                        />
                        <button
                          type="submit"
                          disabled={!chessChatInput.trim() || chessChatSending}
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition hover:bg-rose-600 disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : null}
                  {["solo", "duel"].includes(chessPlayMode) && !isPlatformChessActive ? (
                    <div className="rounded-[1.6rem] border border-slate-100 bg-white p-4 shadow-[0_10px_24px_-18px_rgba(0,0,0,0.12)]">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-3">{language === "ht" ? "Montre echèk" : "Horloge d'échecs"}</div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { color: "white", label: language === "ht" ? "Blan (Ou)" : "Blancs (Vous)", timeLeft: whiteTimeLeft },
                          { color: "black", label: language === "ht" ? "Nwa (IA)" : "Noirs (IA)", timeLeft: blackTimeLeft },
                        ].map(({ color, label, timeLeft }) => {
                          const isActive = chessTurn === color && !chessGameOver;
                          const isUrgent = timeLeft <= 60;
                          return (
                            <div key={color} className={`rounded-[1.2rem] border px-3 py-3 text-center transition-all ${
                              isActive
                                ? isUrgent
                                  ? "border-red-300 bg-red-50 shadow-sm"
                                  : "border-rose-300 bg-rose-50 shadow-sm"
                                : "border-slate-100 bg-slate-50"
                            }`}>
                              <div className={`text-[10px] font-medium uppercase tracking-wide mb-1 ${isActive ? (isUrgent ? "text-red-600" : "text-rose-600") : "text-slate-400"}`}>{label}</div>
                              <div className={`text-xl font-bold tabular-nums ${
                                isActive
                                  ? isUrgent
                                    ? "animate-pulse text-red-700"
                                    : "text-rose-800"
                                  : "text-slate-500"
                              }`}>
                                {formatCountdown(timeLeft)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl bg-[linear-gradient(135deg,_rgba(255,241,242,0.96)_0%,_rgba(255,247,237,0.98)_100%)] px-4 py-4 text-sm text-slate-700 shadow-[0_18px_34px_-30px_rgba(225,29,72,0.18)]">
                    <div className="font-medium text-rose-800">{currentBoardMessage}</div>
                    <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("gamesChessBoardLastMove")}</div>
                    <div className="mt-1 font-semibold text-slate-900">{lastChessMoveLabel}</div>
                    {chessPlayMode === "tournament" ? (
                      <>
                        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("gamesChessTournamentTimer")}</div>
                        <div className={`mt-1 inline-flex items-center gap-2 font-semibold ${tournamentTimeLeft <= 30 ? "text-amber-700" : "text-slate-900"}`}>
                          <Clock3 className="h-4 w-4 text-rose-600" />
                          <span>{tournamentTimerLabel}</span>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div className="rounded-[1.6rem] border border-rose-100 bg-white/90 p-4 shadow-[0_18px_32px_-28px_rgba(225,29,72,0.12)]">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessModeActive")}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{selectedChessPlayMode.title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedChessPlayMode.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {!chessGameOver ? (
                        <>
                          {chessPlayMode !== "duel" ? (
                            <Button
                              type="button"
                              variant="outline"
                              className={`rounded-2xl border-amber-200 ${chessIsPaused ? "bg-amber-50 text-amber-700" : "text-slate-700"}`}
                              onClick={handleChessTogglePause}
                            >
                              {chessIsPaused ? t("gamesChessBoardResume") : t("gamesChessBoardPause")}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={handleChessAbandon}
                            disabled={isChessMoveSyncing}
                          >
                            {t("gamesChessBoardAbandon")}
                          </Button>
                        </>
                      ) : null}
                      <Button type="button" className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95" disabled={isPlatformChessActive && isChessMoveSyncing} onClick={isPlatformChessActive ? handleResetSharedChessGame : resetChessBoard}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {isPlatformChessActive ? t("gamesChessPlatformReset") : t("gamesChessBoardReset")}
                      </Button>
                    </div>
                    {chessIsPaused ? (
                      <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        ⏸ Partie en pause — cliquez Reprendre pour continuer.
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                    <div className="rounded-[1.5rem] bg-rose-50 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessBoardTurn")}</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{t(chessTurn === "white" ? "gamesChessBoardWhite" : "gamesChessBoardBlack")}</div>
                    </div>
                    <div className="rounded-[1.5rem] bg-violet-50 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessBoardPiece")}</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{selectedBoardPiece ? getChessPieceLabel(selectedBoardPiece) : t("gamesChessBoardNone")}</div>
                    </div>
                    <div className="rounded-[1.5rem] bg-[#fff7ed] px-4 py-4 sm:col-span-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessBoardCapturedWhite")}</div>
                      <div className="mt-2 flex min-h-10 flex-wrap items-center gap-2">
                        {capturedWhitePieces.length > 0 ? (
                          capturedWhitePieces.map((piece) => (
                            <span key={piece.id} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_16px_-12px_rgba(90,62,33,0.4)] sm:h-9 sm:w-9">
                              <ChessPieceGlyph piece={piece} sizeClassName="text-[1.3rem] sm:text-[1.5rem]" />
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">{t("gamesChessBoardNone")}</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[1.5rem] bg-rose-50/70 px-4 py-4 sm:col-span-2">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessBoardCapturedBlack")}</div>
                      <div className="mt-2 flex min-h-10 flex-wrap items-center gap-2">
                        {capturedBlackPieces.length > 0 ? (
                          capturedBlackPieces.map((piece) => (
                            <span key={piece.id} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_16px_-12px_rgba(90,62,33,0.4)] sm:h-9 sm:w-9">
                              <ChessPieceGlyph piece={piece} sizeClassName="text-[1.3rem] sm:text-[1.5rem]" />
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">{t("gamesChessBoardNone")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 rounded-[1.75rem] border border-rose-100 bg-white p-5 shadow-[0_14px_30px_-28px_rgba(225,29,72,0.14)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{t("gamesChessChallengeTitle")}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{t("gamesChessChallengeDesc")}</p>
                      </div>
                      <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                        {t("gamesChessScore")} {chessScore}/{chessChallenges.length}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>{t("gamesChessProgress")}</span>
                        <span>{chessCompleted ? chessChallenges.length : chessIndex + 1}/{chessChallenges.length}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all"
                          style={{ width: `${((chessCompleted ? chessChallenges.length : chessIndex + 1) / chessChallenges.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {chessCompleted ? (
                      <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-50 to-rose-50 p-6">
                        <div className="flex items-center gap-3 text-emerald-700">
                          <Trophy className="h-6 w-6" />
                          <div className="text-lg font-semibold">{t("gamesChessCompleted")}</div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-emerald-800">
                          {t("gamesChessScore")} : {chessScore}/{chessChallenges.length}
                        </p>
                        <Button type="button" className="mt-4 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95" onClick={resetChessGame}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t("gamesReset")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-[1.75rem] bg-rose-50 p-5">
                          <p className="text-base font-medium leading-7 text-slate-900">{currentChessChallenge.prompt}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          {chessPieces.map((piece) => {
                            const isSelected = selectedChessPiece === piece.id;
                            const isCorrect = piece.id === currentChessChallenge.correctPiece;
                            const stateClass =
                              selectedChessPiece === null
                                ? "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50"
                                : isCorrect
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : isSelected
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : "border-slate-200 bg-slate-50 text-slate-400";

                            return (
                              <button
                                key={piece.id}
                                type="button"
                                onClick={() => handleChessAnswer(piece.id)}
                                disabled={selectedChessPiece !== null}
                                className={`rounded-[1.5rem] border px-4 py-4 text-left transition-all ${selectedChessPiece === null ? "hover:-translate-y-0.5 hover:shadow-md" : ""} ${stateClass}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(241,245,249,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_-18px_rgba(15,23,42,0.45)]">
                                    <ChessPieceGlyph piece={{ color: "white", type: piece.id, symbol: piece.symbol }} sizeClassName="text-[2.15rem]" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{piece.label}</div>
                                    <div className="mt-1 text-xs uppercase tracking-wide opacity-70">{t("gamesChessSelect")}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className={`rounded-2xl px-4 py-3 text-sm ${chessFeedback === "correct" ? "bg-emerald-50 text-emerald-700" : chessFeedback === "wrong" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                          <span className="font-medium">{t("gamesChessHintLabel")} :</span> {chessMessage}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-95"
                            disabled={selectedChessPiece === null}
                            onClick={handleNextChessChallenge}
                          >
                            {t("gamesChessNext")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" className="rounded-2xl border-slate-300 text-slate-700" onClick={resetChessGame}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {t("gamesReset")}
                          </Button>
                        </div>
                      </>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.5rem] bg-rose-50 px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessProgress")}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{chessCompleted ? chessChallenges.length : chessIndex + 1}/{chessChallenges.length}</div>
                      </div>
                      <div className="rounded-[1.5rem] bg-violet-50 px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessScore")}</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">{chessScore}/{chessChallenges.length}</div>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{t("gamesChessHintLabel")}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{currentChessChallenge.hint}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="montessori-game" className="relative overflow-hidden rounded-[2.2rem] border border-rose-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98)_0%,_rgba(255,244,245,0.98)_38%,_rgba(255,236,240,0.98)_100%)] shadow-[0_32px_80px_-44px_rgba(225,29,72,0.22)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.18),transparent_62%)]" />
          <div className="pointer-events-none absolute -right-12 top-10 h-36 w-36 rounded-full bg-rose-200/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-8 h-28 w-28 rounded-full bg-orange-200/20 blur-3xl" />
          <CardHeader className="relative pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1 xl:max-w-none">
                <Badge className="rounded-full bg-rose-100 text-rose-700 hover:bg-rose-100">
                  {t("gamesMontessoriBadge")}
                </Badge>
                <CardTitle className="mt-4 flex items-center gap-2 text-xl text-slate-900">
                  <BookOpen className="h-5 w-5 text-rose-600" />
                  {t("gamesMontessoriTitle")}
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{t("gamesMontessoriDesc")}</CardDescription>
                <div className="mt-4 w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/70 shadow-[0_20px_40px_-30px_rgba(225,29,72,0.18)] xl:max-w-none">
                  <div className="relative aspect-[1/1] sm:aspect-[16/11] xl:aspect-[16/10]">
                    <Image
                      src="/montessori.png"
                      alt={t("gamesMontessoriTitle")}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 70vw, 760px"
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[26rem]">
                <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_20px_40px_-32px_rgba(225,29,72,0.2)] backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                    <Sparkles className="h-4 w-4" />
                    {t("gamesMontessoriSortTitle")}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">{montessoriSortProgressPercent}%</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{currentMontessoriSortPrompt.label}</div>
                </div>

                <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_20px_40px_-32px_rgba(225,29,72,0.2)] backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("gamesMontessoriSizeTitle")}
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">{montessoriSizeSelections.length}/{montessoriSizeBoard.length}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{montessoriSizeMessage}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-[1.9rem] border border-rose-100 bg-[linear-gradient(135deg,_rgba(255,250,250,0.98)_0%,_rgba(255,241,242,0.98)_100%)] p-6 shadow-[0_24px_50px_-34px_rgba(225,29,72,0.18)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{t("gamesMontessoriSortTitle")}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{t("gamesMontessoriSortDesc")}</p>
                  </div>
                  <Badge className="rounded-full bg-white text-rose-700 shadow-sm hover:bg-white">
                    {montessoriSortIndex + 1}/{montessoriSortPrompts.length}
                  </Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {montessoriSortPrompts.map((prompt, index) => {
                    const isActive = index === montessoriSortIndex;
                    return (
                      <span
                        key={prompt.id}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? "border-rose-200 bg-white text-rose-700 shadow-sm" : "border-white/70 bg-white/60 text-slate-500"}`}
                      >
                        {prompt.label}
                      </span>
                    );
                  })}
                </div>

                <div className={`mt-5 rounded-[1.4rem] border px-4 py-4 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ${montessoriSortMessageClassName}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{montessoriSortMessage}</span>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-current">
                      {montessoriSortSelectionCount}/{montessoriSortExpectedIds.length}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {MONTESSORI_SORT_ITEMS.map((item) => {
                    const isSelected = montessoriSortSelections.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMontessoriSortToggle(item.id)}
                        className={`group rounded-[1.6rem] border px-4 py-4 text-left transition-all ${isSelected ? "border-rose-300 bg-white shadow-[0_20px_34px_-24px_rgba(225,29,72,0.3)]" : "border-white/70 bg-white/80 hover:-translate-y-1 hover:shadow-[0_20px_34px_-24px_rgba(15,23,42,0.2)]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] border text-[1.8rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] ${item.colorClassName}`}>
                            {item.symbol}
                          </div>
                          <div className={`mt-1 h-3 w-3 rounded-full transition-all ${isSelected ? "bg-rose-400 shadow-[0_0_0_5px_rgba(251,113,133,0.15)]" : "bg-slate-200 group-hover:bg-rose-200"}`} />
                        </div>
                        <div className="mt-4 h-1.5 rounded-full bg-rose-100/70">
                          <div className={`h-full rounded-full bg-gradient-to-r from-rose-300 to-orange-300 transition-all ${isSelected ? "w-full" : "w-0 group-hover:w-1/2"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="button" className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_18px_30px_-22px_rgba(225,29,72,0.48)] hover:opacity-95" onClick={handleMontessoriSortValidate}>
                    {t("gamesMontessoriValidate")}
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl border-rose-200 bg-white/80 text-rose-700 hover:bg-white" onClick={handleNextMontessoriSort}>
                    {t("gamesMontessoriNext")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-[1.9rem] border border-rose-100 bg-white/92 p-6 shadow-[0_24px_50px_-34px_rgba(225,29,72,0.16)] backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{t("gamesMontessoriSizeTitle")}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">{t("gamesMontessoriSizeDesc")}</p>
                  </div>
                  <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
                    {montessoriSizeSelections.length}/{montessoriSizeBoard.length}
                  </Badge>
                </div>

                <div className="mt-5 overflow-hidden rounded-full bg-rose-100/70">
                  <div className="h-2 rounded-full bg-gradient-to-r from-rose-300 via-rose-400 to-orange-300 transition-all" style={{ width: `${montessoriSizeProgressPercent}%` }} />
                </div>

                <div className={`mt-5 rounded-[1.4rem] border px-4 py-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${montessoriSizeMessageClassName}`}>
                  {montessoriSizeMessage}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {montessoriSizeBoard.map((item) => {
                    const isSelected = montessoriSizeSelections.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleMontessoriSizeSelection(item.id)}
                        disabled={montessoriSizeCompleted}
                        className={`rounded-[1.55rem] border px-4 py-5 text-center transition-all ${isSelected ? "border-rose-200 bg-[linear-gradient(180deg,_rgba(255,241,242,0.96)_0%,_rgba(255,228,230,0.92)_100%)] shadow-[0_18px_30px_-22px_rgba(225,29,72,0.24)]" : "border-rose-100/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,245,246,0.95)_100%)] hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-[0_18px_30px_-22px_rgba(225,29,72,0.14)]"} ${montessoriSizeCompleted ? "cursor-default" : ""}`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-24 items-end justify-center">
                            <div className={`rounded-full bg-[linear-gradient(180deg,_#ffe4e6_0%,_#fb7185_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_14px_26px_-18px_rgba(159,18,57,0.32)] ${item.sizeClassName}`} />
                          </div>
                          <div className={`text-sm font-medium ${isSelected ? "text-rose-800" : "text-slate-700"}`}>{t(item.labelKey)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" className="rounded-2xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50/60" onClick={resetMontessoriSizeGame}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("gamesMontessoriReset")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr),22rem] xl:items-start">
        <div className="space-y-6">
        <Card id="memory-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-violet-600" />
                  {t("gamesMemoryTitle")}
                </CardTitle>
                <CardDescription>{t("gamesMemoryDesc")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
                  {t("gamesMemoryPairs")} {matchedPairs}/{MEMORY_EMOJIS.length}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {t("gamesMemoryMoves")} {memoryMoves}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {memoryCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isChecking}
                  aria-label={card.revealed || card.matched ? card.emoji : t("gamesMemoryTitle")}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-xl transition-all sm:rounded-[1.4rem] sm:text-2xl ${
                    card.revealed || card.matched
                      ? "border-violet-100 bg-white shadow-sm ring-2 ring-violet-100"
                      : "border-transparent bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-md hover:scale-[1.03] hover:shadow-lg"
                  } ${isChecking ? "cursor-wait" : ""}`}
                >
                  {card.revealed || card.matched ? card.emoji : "?"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">
                {allPairsFound ? t("gamesMemoryWin") : t("gamesMemoryDesc")}
              </div>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={resetMemoryGame}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("gamesReset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="quiz-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  {t("gamesQuizTitle")}
                </CardTitle>
                <CardDescription>{t("gamesQuizDesc")}</CardDescription>
              </div>
              <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                {t("gamesQuizScore")} {quizScore}/{quizQuestions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t("gamesQuizProgress")}</span>
                <span>{quizCompleted ? quizQuestions.length : quizIndex + 1}/{quizQuestions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-500 transition-all"
                  style={{ width: `${((quizCompleted ? quizQuestions.length : quizIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>
            {quizCompleted ? (
              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Trophy className="h-6 w-6" />
                  <div className="text-lg font-semibold">{t("gamesQuizCompleted")}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-800">
                  {t("gamesQuizScore")} : {quizScore}/{quizQuestions.length}
                </p>
                <Button type="button" className="mt-4 rounded-2xl" onClick={resetQuizGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("gamesQuizPlayAgain")}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[1.75rem] bg-slate-50 p-5">
                  <p className="text-base font-medium leading-7 text-slate-900">{currentQuiz.prompt}</p>
                </div>
                <div className="grid gap-3">
                  {currentQuiz.options.map((option, index) => {
                    const isSelected = selectedQuizOption === index;
                    const isCorrect = index === currentQuiz.correctIndex;
                    const stateClass =
                      selectedQuizOption === null
                        ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50"
                        : isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-400";

                    return (
                      <button
                        key={`${quizIndex}-${index}`}
                        type="button"
                        onClick={() => handleQuizAnswer(index)}
                        disabled={selectedQuizOption !== null}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${stateClass}`}
                      >
                        <span>{option}</span>
                        {selectedQuizOption !== null && isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isSelected && !isCorrect ? (
                          <XCircle className="h-4 w-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {selectedQuizOption !== null && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${quizFeedback === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {quizFeedback === "correct" ? t("gamesQuizCorrect") : t("gamesQuizWrong")}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="rounded-2xl"
                    disabled={selectedQuizOption === null}
                    onClick={handleNextQuizStep}
                  >
                    {quizIndex === quizQuestions.length - 1 ? t("gamesQuizFinish") : t("gamesQuizNext")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={resetQuizGame}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("gamesQuizPlayAgain")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        <div className="space-y-6">
        <Card id="emotion-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-cyan-600" />
                  {t("gamesEmotionTitle")}
                </CardTitle>
                <CardDescription>{t("gamesEmotionDesc")}</CardDescription>
              </div>
              <Badge className="rounded-full bg-cyan-50 text-cyan-700 hover:bg-cyan-50">
                {t("gamesEmotionScore")} {emotionScore}/{emotionScenarios.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t("gamesEmotionProgress")}</span>
                <span>{emotionCompleted ? emotionScenarios.length : emotionIndex + 1}/{emotionScenarios.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all"
                  style={{ width: `${((emotionCompleted ? emotionScenarios.length : emotionIndex + 1) / emotionScenarios.length) * 100}%` }}
                />
              </div>
            </div>

            {emotionCompleted ? (
              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Trophy className="h-6 w-6" />
                  <div className="text-lg font-semibold">{t("gamesEmotionCompleted")}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-800">
                  {t("gamesEmotionScore")} : {emotionScore}/{emotionScenarios.length}
                </p>
                <Button type="button" className="mt-4 rounded-2xl" onClick={resetEmotionGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("gamesEmotionPlayAgain")}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[1.75rem] bg-slate-50 p-5">
                  <p className="text-base font-medium leading-7 text-slate-900">{currentEmotion.prompt}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {emotionOptions.map((option) => {
                    const isSelected = selectedEmotion === option.id;
                    const isCorrect = option.id === currentEmotion.correctEmotion;
                    const stateClass =
                      selectedEmotion === null
                        ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50"
                        : isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-400";

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleEmotionAnswer(option.id)}
                        disabled={selectedEmotion !== null}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${stateClass}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{option.emoji}</span>
                          <span>{option.label}</span>
                        </span>
                        {selectedEmotion !== null && isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isSelected && !isCorrect ? (
                          <XCircle className="h-4 w-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className={`rounded-2xl px-4 py-3 text-sm ${emotionFeedback === "correct" ? "bg-emerald-50 text-emerald-700" : emotionFeedback === "wrong" ? "bg-amber-50 text-amber-700" : "bg-cyan-50 text-cyan-700"}`}>
                  <span className="font-medium">{t("gamesEmotionTipLabel")} :</span> {emotionMessage}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="rounded-2xl"
                    disabled={selectedEmotion === null}
                    onClick={handleNextEmotionCard}
                  >
                    {t("gamesEmotionNext")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={resetEmotionGame}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("gamesEmotionPlayAgain")}
                  </Button>
                </div>
              </>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t("gamesEmotionProgress")}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-800">
                  {emotionCompleted ? emotionScenarios.length : emotionIndex + 1}/{emotionScenarios.length}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t("gamesEmotionScore")}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-800">{emotionScore}/{emotionScenarios.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

          <div className="space-y-6 xl:sticky xl:top-24">
            <Card id="kids-subscription" className="rounded-[2rem] border border-sky-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(240,249,255,0.98)_100%)] shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge className="w-fit rounded-full bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                      {t("gamesSubscriptionBadge")}
                    </Badge>
                    <CardTitle className="mt-4 text-xl text-slate-900">{t("gamesSubscriptionTitle")}</CardTitle>
                    <CardDescription className="mt-3 text-sm leading-7 text-slate-600">
                      {t("gamesSubscriptionDesc")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {membershipTiers.map((tier) => {
                    const Icon = tier.icon;
                    return (
                      <div key={tier.id} className={`rounded-[1.75rem] p-5 ${tier.cardClassName}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                            <Icon className="h-5 w-5" />
                          </div>
                          {tier.badge ? (
                            <Badge className="rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/10">
                              {tier.badge}
                            </Badge>
                          ) : null}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">{tier.title}</h3>
                        <p className={`mt-2 text-sm leading-7 ${tier.featureTextClassName}`}>{tier.description}</p>
                        <div className="mt-4 space-y-2.5">
                          {tier.featureKeys.map((featureKey) => (
                            <div key={featureKey} className="flex items-start gap-3 text-sm">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                              <span className={tier.featureTextClassName}>{t(featureKey)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-[1.75rem] border border-sky-100 bg-white p-5">
                  <div className="flex items-center gap-3 text-slate-900">
                    <Rocket className="h-5 w-5 text-cyan-600" />
                    <h3 className="font-semibold">{t("gamesRoadmapTitle")}</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {roadmapItems.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="button" disabled className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white opacity-100 disabled:cursor-not-allowed disabled:opacity-70">
                  {t("gamesSubscriptionCta")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {chessAbandonConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setChessAbandonConfirmOpen(false)} />
          <div className="relative w-full max-w-sm rounded-[1.75rem] border border-rose-100 bg-white p-6 shadow-[0_32px_64px_-20px_rgba(225,29,72,0.22),0_16px_32px_-16px_rgba(15,23,42,0.18)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
              🏳️
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{t("gamesChessBoardAbandon")}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("gamesChessBoardAbandonConfirm")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => setChessAbandonConfirmOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-90"
                onClick={confirmChessAbandon}
              >
                {t("gamesChessBoardAbandon")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
