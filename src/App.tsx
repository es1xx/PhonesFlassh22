/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Terminal,
  Cpu,
  Coins,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Play,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShoppingBag,
  Zap,
  Users,
  Radio,
  ShieldCheck,
  RotateCcw,
  Settings,
  HelpCircle,
  Wrench,
  Flame,
  XCircle,
  Vibrate,
  PowerOff,
  Layers,
  Activity,
  Laptop,
  Monitor,
  Eye,
  EyeOff,
  User,
  Award,
  Trash2,
  ArrowRight,
  TrendingUp,
  HardDrive,
  RefreshCw,
  Sliders,
  Check
} from 'lucide-react';

// --- TELEGRAM WEBAPP TYPES ---
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        initData?: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

// --- TYPES & DEFINITIONS ---

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

type FlashingStage =
  | 'idle'
  | 'holding_buttons'
  | 'mi_unlock_required'
  | 'fastboot'
  | 'download'
  | 'dfu'
  | 'recovery_menu'
  | 'flashing_rom'
  | 'jailbreaking'
  | 'booting'
  | 'bootloop'
  | 'hard_brick'
  | 'complete';

interface RomOption {
  id: string;
  name: string;
  desc: string;
  successChance: number;
  flashDuration: number;
  sellMultiplier: number;
  color: string;
}

interface PhoneModel {
  id: string;
  brand: string;
  name: string;
  codename: string;
  soc: string;
  rarity: Rarity;
  basePrice: number;
  emoji: string;
  chassis: 'iphone_classic' | 'iphone_notch' | 'samsung_infinity' | 'pixel_visor' | 'nothing_glyph' | 'redmi_chin';
  firmwareNote: string | null;
  sources: string[];
  romOptions: RomOption[];
}

interface UserCard {
  instanceId: string;
  phoneId: string;
  flashed: boolean;
  flashedRom?: string;
  sellMultiplier: number;
  acquiredAt: number;
}

interface UserStats {
  totalFlashed: number;
  totalAttempts: number;
  bootloopsRescued: number;
  hardBricksRescued: number;
  miUnlockedCount: number;
  appleJailbreaks: number;
}

const PHONES: PhoneModel[] = [
  {
    id: 'iphone7',
    brand: 'Apple',
    name: 'iPhone 7',
    codename: 'iphone7',
    soc: 'Apple A10 Fusion',
    rarity: 'common',
    basePrice: 120,
    emoji: '🍏',
    chassis: 'iphone_classic',
    firmwareNote: 'No Fastboot exists on Apple! Uses pure DFU Mode and checkm8 bootrom exploit.',
    sources: ['https://palera.in'],
    romOptions: [
      {
        id: 'palera1n_rootless',
        name: 'palera1n Rootless (Sileo)',
        desc: 'Stable modern rootless jailbreak without touching system APFS partition.',
        successChance: 0.88,
        flashDuration: 4,
        sellMultiplier: 1.5,
        color: '#38bdf8'
      },
      {
        id: 'palera1n_rootful',
        name: 'palera1n Rootful (FakeFS 10GB)',
        desc: 'Full FakeFS partition write. Heavy load and deep tweak compatibility.',
        successChance: 0.60,
        flashDuration: 8,
        sellMultiplier: 2.4,
        color: '#f59e0b'
      }
    ]
  },
  {
    id: 'sweet',
    brand: 'Redmi',
    name: 'Redmi Note 10 Pro',
    codename: 'sweet',
    soc: 'Qualcomm Snapdragon 732G',
    rarity: 'common',
    basePrice: 140,
    emoji: '📱',
    chassis: 'redmi_chin',
    firmwareNote: 'Xiaomi OEM Bootloader Lock requires Mi Flash Unlock Tool before fastboot flashing.',
    sources: ['https://wiki.lineageos.org/devices/sweet/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21 (Official)',
        desc: 'Clean Android 14, rock-solid stability and battery efficiency.',
        successChance: 0.85,
        flashDuration: 4,
        sellMultiplier: 1.5,
        color: '#06b6d4'
      },
      {
        id: 'pixelos',
        name: 'PixelOS (Android 14)',
        desc: 'Google Pixel user interface with exclusive photography features.',
        successChance: 0.72,
        flashDuration: 6,
        sellMultiplier: 1.9,
        color: '#3b82f6'
      },
      {
        id: 'hyperos_eu',
        name: 'HyperOS Xiaomi.eu Port',
        desc: 'Flagship Xiaomi OS port with telemetry removed. High flashing complexity!',
        successChance: 0.52,
        flashDuration: 10,
        sellMultiplier: 2.8,
        color: '#f43f5e'
      }
    ]
  },
  {
    id: 'rosemary',
    brand: 'Redmi',
    name: 'Redmi 9',
    codename: 'rosemary',
    soc: 'MediaTek Helio G80',
    rarity: 'common',
    basePrice: 110,
    emoji: '📱',
    chassis: 'redmi_chin',
    firmwareNote: 'Requires preloader bypass and Mi Unlock tool before custom recovery.',
    sources: ['https://wiki.lineageos.org/devices/rosemary/'],
    romOptions: [
      {
        id: 'lineage20',
        name: 'LineageOS 20 (Lightweight)',
        desc: 'Optimized specifically for Helio G80 architecture.',
        successChance: 0.82,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#06b6d4'
      },
      {
        id: 'crdroid',
        name: 'crDroid Android 13',
        desc: 'Maximum performance tweaks and UI personalization.',
        successChance: 0.65,
        flashDuration: 7,
        sellMultiplier: 2.2,
        color: '#8b5cf6'
      }
    ]
  },
  {
    id: 'vayu',
    brand: 'POCO',
    name: 'POCO X3 Pro',
    codename: 'vayu',
    soc: 'Qualcomm Snapdragon 860',
    rarity: 'rare',
    basePrice: 240,
    emoji: '⚡',
    chassis: 'redmi_chin',
    firmwareNote: 'Snapdragon 860 beast. Requires unlocked bootloader via Mi Flash tool.',
    sources: ['https://wiki.lineageos.org/devices/vayu/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Official stable build with microG support.',
        successChance: 0.85,
        flashDuration: 4,
        sellMultiplier: 1.5,
        color: '#06b6d4'
      },
      {
        id: 'evolutionx',
        name: 'Evolution X 8.4 (Gaming Kernel)',
        desc: 'Gaming-optimized ROM with overclocked GPU scheduler.',
        successChance: 0.62,
        flashDuration: 8,
        sellMultiplier: 2.3,
        color: '#ec4899'
      }
    ]
  },
  {
    id: 'iphone8',
    brand: 'Apple',
    name: 'iPhone 8',
    codename: 'iphone8',
    soc: 'Apple A11 Bionic',
    rarity: 'rare',
    basePrice: 260,
    emoji: '🍏',
    chassis: 'iphone_classic',
    firmwareNote: 'Passcode must be fully disabled before entering DFU on A11!',
    sources: ['https://palera.in'],
    romOptions: [
      {
        id: 'palera1n_rootless',
        name: 'palera1n Rootless (Sileo)',
        desc: 'Fast semi-tethered jailbreak with Sileo package manager.',
        successChance: 0.85,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#38bdf8'
      },
      {
        id: 'checkra1n_zebra',
        name: 'checkra1n + Zebra Manager',
        desc: 'Classic exploit with lightweight Zebra package manager.',
        successChance: 0.68,
        flashDuration: 7,
        sellMultiplier: 2.1,
        color: '#a855f7'
      }
    ]
  },
  {
    id: 'beyond0lte',
    brand: 'Samsung',
    name: 'Galaxy S10e',
    codename: 'beyond0lte',
    soc: 'Samsung Exynos 9820',
    rarity: 'rare',
    basePrice: 280,
    emoji: '🌌',
    chassis: 'samsung_infinity',
    firmwareNote: 'Exynos model only (SM-G970F). Uses Heimdall Download Mode.',
    sources: ['https://wiki.lineageos.org/devices/beyond0lte/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Clean Android for compact flagship device.',
        successChance: 0.80,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#06b6d4'
      },
      {
        id: 'noble_rom',
        name: 'Noble ROM (OneUI 6.1 Port)',
        desc: 'Port of Galaxy S24 OneUI with full Galaxy AI suite.',
        successChance: 0.55,
        flashDuration: 10,
        sellMultiplier: 2.7,
        color: '#3b82f6'
      }
    ]
  },
  {
    id: 'lynx',
    brand: 'Google',
    name: 'Pixel 7a',
    codename: 'lynx',
    soc: 'Google Tensor G2',
    rarity: 'rare',
    basePrice: 300,
    emoji: '🤖',
    chassis: 'pixel_visor',
    firmwareNote: 'Pixel Tensor security. Supports direct fastboot flashing unlock.',
    sources: ['https://wiki.lineageos.org/devices/lynx/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Open-source de-Googled Android experience.',
        successChance: 0.88,
        flashDuration: 4,
        sellMultiplier: 1.5,
        color: '#06b6d4'
      },
      {
        id: 'grapheneos',
        name: 'GrapheneOS (Hardened Privacy)',
        desc: 'Ultra-secure OS with hardened memory allocators.',
        successChance: 0.70,
        flashDuration: 7,
        sellMultiplier: 2.2,
        color: '#10b981'
      }
    ]
  },
  {
    id: 'iphonex',
    brand: 'Apple',
    name: 'iPhone X',
    codename: 'iphonex',
    soc: 'Apple A11 Bionic OLED',
    rarity: 'epic',
    basePrice: 420,
    emoji: '🍏',
    chassis: 'iphone_notch',
    firmwareNote: 'Face ID must be off before checkm8 DFU injection.',
    sources: ['https://palera.in'],
    romOptions: [
      {
        id: 'palera1n_rootless',
        name: 'palera1n Rootless (Sileo)',
        desc: 'Modern iOS 16 jailbreak with tweak injection hooks.',
        successChance: 0.82,
        flashDuration: 5,
        sellMultiplier: 1.7,
        color: '#38bdf8'
      },
      {
        id: 'trollstore_kit',
        name: 'palera1n + TrollStore 2',
        desc: 'Permanent CoreTrust IPA signing without revoked certs.',
        successChance: 0.58,
        flashDuration: 9,
        sellMultiplier: 2.6,
        color: '#f59e0b'
      }
    ]
  },
  {
    id: 'spacewar',
    brand: 'Nothing',
    name: 'Nothing Phone (1)',
    codename: 'spacewar',
    soc: 'Qualcomm Snapdragon 778G+',
    rarity: 'epic',
    basePrice: 450,
    emoji: '💡',
    chassis: 'nothing_glyph',
    firmwareNote: 'Glyph LED interface requires open-source driver integration.',
    sources: ['https://wiki.lineageos.org/devices/spacewar/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Stock Android with complete Glyph LED light orchestration.',
        successChance: 0.84,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#06b6d4'
      },
      {
        id: 'paranoid_android',
        name: 'Paranoid Android Uvista',
        desc: 'Custom UI gestures and low-latency audio engine.',
        successChance: 0.65,
        flashDuration: 8,
        sellMultiplier: 2.4,
        color: '#ec4899'
      }
    ]
  },
  {
    id: 'cheetah',
    brand: 'Google',
    name: 'Pixel 7 Pro',
    codename: 'cheetah',
    soc: 'Google Tensor G2 (120Hz LTPO)',
    rarity: 'legendary',
    basePrice: 700,
    emoji: '🤖',
    chassis: 'pixel_visor',
    firmwareNote: 'Native fastboot flashing unlock supported directly.',
    sources: ['https://wiki.lineageos.org/devices/cheetah/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Buttery smooth 120Hz clean Android build.',
        successChance: 0.85,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#06b6d4'
      },
      {
        id: 'grapheneos_hardened',
        name: 'GrapheneOS Hardened Enterprise',
        desc: 'Maximum defense against zero-day exploits.',
        successChance: 0.62,
        flashDuration: 8,
        sellMultiplier: 2.6,
        color: '#10b981'
      }
    ]
  },
  {
    id: 'shiba',
    brand: 'Google',
    name: 'Pixel 8',
    codename: 'shiba',
    soc: 'Google Tensor G3',
    rarity: 'legendary',
    basePrice: 750,
    emoji: '🤖',
    chassis: 'pixel_visor',
    firmwareNote: 'Next-gen Tensor G3 Titan M2 security enclave.',
    sources: ['https://wiki.lineageos.org/devices/shiba/'],
    romOptions: [
      {
        id: 'lineage21',
        name: 'LineageOS 21',
        desc: 'Official upstream Android 14 release.',
        successChance: 0.85,
        flashDuration: 5,
        sellMultiplier: 1.6,
        color: '#06b6d4'
      },
      {
        id: 'calyxos',
        name: 'CalyxOS Privacy Suite',
        desc: 'Anonymous Android with built-in Tor and Datura Firewall.',
        successChance: 0.55,
        flashDuration: 10,
        sellMultiplier: 2.9,
        color: '#8b5cf6'
      }
    ]
  }
];

const safeGet = (key: string, fallback: string): string => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key: string, val: string): void => {
  try {
    localStorage.setItem(key, val);
  } catch {}
};

const CLAIM_COOLDOWN_SECONDS = 3 * 60 * 60; // 3 hours (10,800 seconds)

const formatCooldownTimer = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'collection' | 'shop' | 'profile' | 'admin'>('collection');
  const [filter, setFilter] = useState<'all' | 'flashed' | 'stock'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blurEnabled, setBlurEnabled] = useState(() => safeGet('flasher_blur', 'true') === 'true');
  const [isDesktopWide, setIsDesktopWide] = useState(() => safeGet('flasher_desktop', 'false') === 'true');

  // Economy & Collection
  const [coins, setCoins] = useState(() => parseInt(safeGet('flasher_coins', '400'), 10));
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    try {
      const lastClaimStr = localStorage.getItem('flasher_last_claim_timestamp');
      if (lastClaimStr) {
        const lastClaimTime = parseInt(lastClaimStr, 10);
        if (!isNaN(lastClaimTime)) {
          const elapsedSec = Math.floor((Date.now() - lastClaimTime) / 1000);
          const remaining = CLAIM_COOLDOWN_SECONDS - elapsedSec;
          return remaining > 0 ? remaining : 0;
        }
      }
    } catch {}
    return 0;
  });
  const [collection, setCollection] = useState<UserCard[]>(() => {
    try {
      const saved = localStorage.getItem('flasher_collection');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { instanceId: 'inst_1', phoneId: 'sweet', flashed: false, sellMultiplier: 1.0, acquiredAt: Date.now() - 3600000 },
      { instanceId: 'inst_2', phoneId: 'iphone7', flashed: false, sellMultiplier: 1.0, acquiredAt: Date.now() - 7200000 }
    ];
  });

  // Career Statistics
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem('flasher_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalFlashed: 0,
      totalAttempts: 0,
      bootloopsRescued: 0,
      hardBricksRescued: 0,
      miUnlockedCount: 0,
      appleJailbreaks: 0
    };
  });

  // Workshop Mini-Game State
  const [activeCard, setActiveCard] = useState<UserCard | null>(null);
  const [selectedRom, setSelectedRom] = useState<RomOption | null>(null);
  const [stage, setStage] = useState<FlashingStage>('idle');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [holdingSeconds, setHoldingSeconds] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Realistic flashing nuances
  const [isDataWiped, setIsDataWiped] = useState(false);
  const [isBootloaderUnlocked, setIsBootloaderUnlocked] = useState(false);
  const [showMiUnlockModal, setShowMiUnlockModal] = useState(false);
  const [miUnlockProgress, setMiUnlockProgress] = useState(0);
  const [isMiUnlocking, setIsMiUnlocking] = useState(false);

  // Telegram WebApp Integration & State
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  // Native Telegram Haptic Feedback Handler
  const triggerHaptic = (
    type: 'impact' | 'success' | 'warning' | 'error',
    style: 'light' | 'medium' | 'heavy' = 'medium'
  ) => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'impact') {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        } else {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
        }
      }
    } catch {}
  };

  // Telegram WebApp Lifecycle (ready, expand, colors, initData extraction)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tw = window.Telegram.WebApp;
      try {
        tw.ready();
        tw.expand();
        tw.setHeaderColor?.('#020617');
        tw.setBackgroundColor?.('#020617');
      } catch {}

      if (tw.initDataUnsafe?.user) {
        setTgUser(tw.initDataUnsafe.user);
        setIsTelegram(true);
      }
    }
  }, []);

  const isAdmin = tgUser ? tgUser.id.toString() === '7674443928' : true;

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio Synth
  const playSound = (freq = 440, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    safeSet('flasher_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    safeSet('flasher_collection', JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    safeSet('flasher_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    safeSet('flasher_blur', blurEnabled ? 'true' : 'false');
  }, [blurEnabled]);

  useEffect(() => {
    safeSet('flasher_desktop', isDesktopWide ? 'true' : 'false');
  }, [isDesktopWide]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  // Claim phone
  const handleClaim = () => {
    if (cooldownRemaining > 0) return;
    playSound(587, 'triangle', 0.12);
    triggerHaptic('success');
    const chosen = PHONES[Math.floor(Math.random() * PHONES.length)];
    const newCard: UserCard = {
      instanceId: `inst_${Date.now()}`,
      phoneId: chosen.id,
      flashed: false,
      sellMultiplier: 1.0,
      acquiredAt: Date.now()
    };
    setCollection(prev => [newCard, ...prev]);
    const now = Date.now();
    try {
      localStorage.setItem('flasher_last_claim_timestamp', now.toString());
    } catch {}
    setCooldownRemaining(CLAIM_COOLDOWN_SECONDS);
    showToast(`🎉 ${chosen.name} delivered to your workbench!`);
  };

  // Sell phone
  const handleSell = (instanceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = collection.find(c => c.instanceId === instanceId);
    if (!card) return;
    const phone = PHONES.find(p => p.id === card.phoneId);
    if (!phone) return;

    const mult = card.flashed ? (card.sellMultiplier || 1.5) : 1.0;
    const price = Math.floor(phone.basePrice * mult);

    setCoins(prev => prev + price);
    setCollection(prev => prev.filter(c => c.instanceId !== instanceId));
    playSound(659, 'sine', 0.12);
    triggerHaptic('impact', 'light');
    showToast(`💰 Sold ${phone.name} for ${price} coins!`);
  };

  // Buy phone from shop
  const handleBuy = (phone: PhoneModel) => {
    const cost = phone.basePrice * 2;
    if (coins < cost) {
      showToast('❌ Insufficient coins!');
      playSound(200, 'sawtooth', 0.2);
      triggerHaptic('warning');
      return;
    }
    setCoins(prev => prev - cost);
    setCollection(prev => [
      {
        instanceId: `inst_${Date.now()}`,
        phoneId: phone.id,
        flashed: false,
        sellMultiplier: 1.0,
        acquiredAt: Date.now()
      },
      ...prev
    ]);
    playSound(784, 'triangle', 0.12);
    triggerHaptic('success');
    showToast(`✅ Purchased ${phone.name}!`);
  };

  // OPEN WORKBENCH
  const currentPhone = activeCard ? PHONES.find(p => p.id === activeCard.phoneId) : null;

  const openFlashLab = (card: UserCard) => {
    const phone = PHONES.find(p => p.id === card.phoneId) || PHONES[0];
    setActiveCard(card);
    setSelectedRom(phone.romOptions[0] || null);
    setStage('idle');
    setProgressPct(0);
    setHoldingSeconds(0);
    setIsDataWiped(false);
    setShowMiUnlockModal(false);

    // Xiaomi devices are bootloader locked by default
    const isXiaomi = phone.brand === 'Redmi' || phone.brand === 'POCO';
    setIsBootloaderUnlocked(!isXiaomi);

    const isApple = phone.brand === 'Apple';
    setTerminalLogs([
      `bash: ~/platform-tools$ ${isApple ? 'usbmuxd -f -v' : 'adb devices'}`,
      isApple ? `[usbmuxd] Attached Apple Mobile Device: ${phone.name} (USB Mux)` : `List of devices attached:\n* target_usb_01    device (${phone.codename})`,
      isApple
        ? `[palera1n] Device connected in Normal Mode. Press 'Hold Power + Vol Down' for 4s to trigger DFU.`
        : isXiaomi
        ? `[fastboot] OEM Bootloader: LOCKED. (Mi Flash Unlock Tool required).`
        : `[fastboot] OEM Bootloader: UNLOCKED. Hold buttons for 3s to enter Fastboot.`
    ]);
    playSound(520, 'sine', 0.08);
  };

  // HARD BRICK MECHANIC: INTERRUPTING POWER DURING FLASHING
  const triggerHardBrick = () => {
    if (stage === 'flashing_rom' || stage === 'jailbreaking') {
      if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
      setStage('hard_brick');
      playSound(150, 'sawtooth', 0.6);
      triggerHaptic('error');
      const isApple = currentPhone?.brand === 'Apple';
      setTerminalLogs(prev => [
        ...prev,
        '🚨 [FATAL ERROR] Hardware power cut during critical NAND flash write!',
        isApple
          ? '[AP TICKET PANIC] NOR Bootrom halted. Signature broken -> APPLE DFU RESTORE REQUIRED.'
          : '[CRASHDUMP] Partition table corrupted! Qualcomm HS-USB QDLoader 9008 activated.',
        'Device is Hard Bricked. Emergency Unbrick Tool required.'
      ]);
      setStats(prev => ({ ...prev, hardBricksRescued: prev.hardBricksRescued }));
      showToast('💥 HARD BRICK! Power disconnected during critical block write!');
    }
  };

  // HOLD HARDWARE BUTTONS (APPLE: DFU ONLY; ANDROID: FASTBOOT / ODIN)
  const startHoldingButtons = () => {
    if (stage === 'flashing_rom' || stage === 'jailbreaking') {
      triggerHardBrick();
      return;
    }

    if (stage !== 'idle' && stage !== 'bootloop') return;
    setStage('holding_buttons');
    setHoldingSeconds(0);
    playSound(400, 'sine', 0.05);
    triggerHaptic('impact', 'medium');

    holdIntervalRef.current = setInterval(() => {
      setHoldingSeconds(prev => {
        const next = prev + 1;
        playSound(440 + next * 60, 'sine', 0.04);

        if (!currentPhone) return next;

        // Apple iPhone: Hold 4s -> DFU (NO FASTBOOT ON APPLE!)
        if (currentPhone.brand === 'Apple' && next >= 4) {
          clearInterval(holdIntervalRef.current!);
          setStage('dfu');
          playSound(880, 'triangle', 0.2);
          setTerminalLogs(prevLogs => [
            ...prevLogs,
            '$ palera1n --dfuhelper',
            '[+] Success: Apple device entered DFU Mode (Deep Black OLED screen)!',
            '[+] checkm8 USB exploit payload primed and ready.'
          ]);
          return next;
        }

        // Samsung Galaxy: Hold 3s -> Odin Download
        if (currentPhone.brand === 'Samsung' && next >= 3) {
          clearInterval(holdIntervalRef.current!);
          setStage('download');
          playSound(750, 'triangle', 0.2);
          setTerminalLogs(prevLogs => [
            ...prevLogs,
            'Heimdall: Samsung Galaxy detected in Odin Download Mode!'
          ]);
          return next;
        }

        // Xiaomi / Pixel / Nothing: Hold 3s -> Fastboot
        if (currentPhone.brand !== 'Apple' && next >= 3) {
          clearInterval(holdIntervalRef.current!);
          setStage('fastboot');
          playSound(800, 'triangle', 0.2);
          const isXiaomi = currentPhone.brand === 'Redmi' || currentPhone.brand === 'POCO';
          setTerminalLogs(prevLogs => [
            ...prevLogs,
            `$ fastboot devices`,
            `target_dev    fastboot (${currentPhone.codename})`,
            isXiaomi && !isBootloaderUnlocked
              ? `[OEM_LOCK] Bootloader is locked. Run Mi Flash Unlock Tool before recovery flashing!`
              : `Bootloader unlocked. Ready for recovery installation.`
          ]);
          return next;
        }

        return next;
      });
    }, 1000);
  };

  const stopHoldingButtons = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    if (stage === 'holding_buttons') {
      setStage('idle');
      playSound(250, 'sawtooth', 0.15);
      showToast('⚠️ Buttons released too early! Hold firmly for 3-4 seconds.');
    }
  };

  // XIAOMI MI FLASH UNLOCK TOOL SIMULATOR
  const runMiUnlockTool = () => {
    setIsMiUnlocking(true);
    setMiUnlockProgress(0);
    playSound(600, 'square', 0.08);
    triggerHaptic('impact', 'medium');

    const interval = setInterval(() => {
      setMiUnlockProgress(prev => {
        const next = prev + 20;
        playSound(500 + next * 4, 'sine', 0.03);
        if (next >= 100) {
          clearInterval(interval);
          setIsMiUnlocking(false);
          setIsBootloaderUnlocked(true);
          setShowMiUnlockModal(false);
          setStats(s => ({ ...s, miUnlockedCount: s.miUnlockedCount + 1 }));
          setTerminalLogs(prevLogs => [
            ...prevLogs,
            `$ miunlock --auth token_7674443928 --device ${currentPhone?.codename}`,
            `Connecting to Xiaomi Global Cloud Auth... Authenticated!`,
            `Bypassing 168h wait queue with Developer Authority token...`,
            `fastboot oem unlock: SUCCESS (Bootloader is now UNLOCKED)`
          ]);
          playSound(980, 'triangle', 0.25);
          triggerHaptic('success');
          showToast('🔓 Bootloader successfully unlocked via Mi Unlock Tool!');
          return 100;
        }
        return next;
      });
    }, 400);
  };

  // FLASH RECOVERY (ANDROID ONLY)
  const handleFlashRecovery = () => {
    if (currentPhone?.brand === 'Apple') return;

    // Check Xiaomi Bootloader Lock
    const isXiaomi = currentPhone?.brand === 'Redmi' || currentPhone?.brand === 'POCO';
    if (isXiaomi && !isBootloaderUnlocked) {
      playSound(220, 'sawtooth', 0.2);
      triggerHaptic('warning');
      setTerminalLogs(prev => [
        ...prev,
        '$ fastboot flash recovery recovery.img',
        'FAILED (remote: Token verify failed, device is locked!)',
        '⚠️ You must unlock the bootloader with Mi Flash Unlock Tool first!'
      ]);
      setShowMiUnlockModal(true);
      return;
    }

    playSound(600, 'square', 0.08);
    triggerHaptic('impact', 'medium');
    setTerminalLogs(prev => [
      ...prev,
      '$ fastboot flash recovery recovery.img',
      'Sending recovery.img (64MB)... OKAY [0.88s]',
      'Writing recovery... OKAY [0.35s]',
      'Rebooting into custom Lineage/TWRP recovery environment...'
    ]);

    setTimeout(() => {
      setStage('recovery_menu');
      playSound(950, 'sine', 0.15);
    }, 600);
  };

  // RECOVERY ACTION: WIPE / FORMAT DATA
  const handleFormatData = () => {
    playSound(700, 'sine', 0.1);
    triggerHaptic('impact', 'light');
    setIsDataWiped(true);
    setTerminalLogs(prev => [
      ...prev,
      `[Recovery] Formatting /data and /cache partitions...`,
      `[Recovery] Unmounting cryptfs / userdata...`,
      `[Recovery] Re-encrypting userdata partition table (ext4)... DONE!`,
      `[Recovery] Clean flash environment prepared. New ROM will boot without bootloop!`
    ]);
    showToast('🧹 /data partition formatted! Ready for clean install.');
  };

  // EXECUTE ROM FLASH OR PALERA1N JAILBREAK
  const handleStartFlashing = () => {
    if (!selectedRom || !currentPhone) return;

    setStats(s => ({ ...s, totalAttempts: s.totalAttempts + 1 }));
    triggerHaptic('impact', 'heavy');

    if (currentPhone.brand === 'Apple') {
      // Apple Jailbreak Flow (NO ADB, NO FASTBOOT)
      setStage('jailbreaking');
      playSound(650, 'square', 0.08);
      setTerminalLogs(prev => [
        ...prev,
        `$ palera1n -l --version 2.0.0`,
        `[*] Target: Apple ${currentPhone.name} (${currentPhone.soc})`,
        `[*] Mode: ${selectedRom.name}`,
        `[*] Exploiting checkm8 USB vulnerability on DFU interface...`,
        `[+] Injecting PongoOS kernel & stage2 shellcode...`
      ]);
    } else {
      // Android Sideload Flow
      setStage('flashing_rom');
      playSound(550, 'square', 0.08);
      setTerminalLogs(prev => [
        ...prev,
        `$ adb -d sideload ${selectedRom.id}.zip`,
        `[Sideload] ROM Package: ${selectedRom.name}`,
        `[Sideload] Clean Wipe Status: ${isDataWiped ? 'YES (Formatted)' : 'NO (DIRTY FLASH)'}`,
        `serving: ${selectedRom.id}.zip (~0%)`
      ]);
    }

    setProgressPct(0);
    const duration = selectedRom.flashDuration * 1000;
    const intervalStep = 100;
    let elapsed = 0;

    flashIntervalRef.current = setInterval(() => {
      elapsed += intervalStep;
      const currentPct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgressPct(currentPct);
      playSound(450 + currentPct * 5, 'sine', 0.02);

      if (elapsed >= duration) {
        clearInterval(flashIntervalRef.current!);

        // Roll success/failure based on ROM chance
        const isSuccess = Math.random() <= selectedRom.successChance;

        if (!isSuccess) {
          setStage('hard_brick');
          playSound(180, 'sawtooth', 0.4);
          triggerHaptic('error');
          setTerminalLogs(prev => [
            ...prev,
            '❌ INSTALLATION FAILED! (Status 7: Verification error)',
            'System partition unbootable! Device is in hard brick mode.'
          ]);
          showToast('💥 Flashing failed! Hardware failure triggered.');
          return;
        }

        // REALISTIC BOOTLOOP MECHANIC:
        // On Android, if the user flashes a new Custom ROM without wiping /data,
        // encrypted userdata fails to mount -> BOOTLOOP!
        if (currentPhone.brand !== 'Apple' && !isDataWiped) {
          setStage('bootloop');
          playSound(280, 'sawtooth', 0.5);
          triggerHaptic('warning');
          setTerminalLogs(prev => [
            ...prev,
            `[    2.109281] e2fsck: /dev/block/bootdevice/by-name/userdata: Key mismatch!`,
            `[    2.518902] init: Critical service 'vold' died with exit code 134`,
            `[    3.102391] init: System rebooting to rescue party (BOOTLOOP DETECTED)`,
            `🚨 BOOTLOOP! You flashed ${selectedRom.name} without formatting /data!`,
            `The new kernel cannot decrypt stock userdata. Re-enter Recovery and Format Data!`
          ]);
          setStats(s => ({ ...s, bootloopsRescued: s.bootloopsRescued + 1 }));
          showToast('⚠️ BOOTLOOP DETECTED! Encrypted /data must be formatted in Recovery.');
          return;
        }

        // Clean boot
        setStage('booting');
        playSound(900, 'sine', 0.2);
        setTerminalLogs(prev => [
          ...prev,
          currentPhone.brand === 'Apple'
            ? '[+] Sileo rootless injected! Apple iOS booted with tweaks active!'
            : 'serving: 100% Total xfer: 1.00x (Success)\n[RECOVERY] Clean userdata verified. System booting...'
        ]);

        if (currentPhone.brand === 'Apple') {
          setStats(s => ({ ...s, appleJailbreaks: s.appleJailbreaks + 1 }));
        }

        setTimeout(() => {
          setStage('complete');
          playSound(1046, 'sine', 0.3);
          triggerHaptic('success');
        }, 2200);
      }
    }, intervalStep);
  };

  // UNBRICK TOOL (EDL 9008 / DFU RESTORE)
  const handleUnbrick = () => {
    playSound(580, 'sine', 0.1);
    triggerHaptic('success');
    const isApple = currentPhone?.brand === 'Apple';

    setTerminalLogs(prev => [
      ...prev,
      isApple
        ? '$ idevicerestore -d --erase\nRestoring Apple IPSW via DFU Mode... OKAY [2.1s]'
        : '$ edl --unbrick --force-recovery\nConnecting to Qualcomm Emergency Download Mode (EDL 9008)...\nRestoring bootloader: OKAY [1.45s]'
    ]);

    setStats(s => ({ ...s, hardBricksRescued: s.hardBricksRescued + 1 }));

    setTimeout(() => {
      setStage(isApple ? 'idle' : 'fastboot');
      showToast('🛠️ Device successfully unbricked and restored!');
      playSound(880, 'sine', 0.15);
    }, 1000);
  };

  // FORCE REBOOT TO RECOVERY FROM BOOTLOOP
  const handleRescueFromBootloop = () => {
    playSound(600, 'sine', 0.1);
    triggerHaptic('impact', 'medium');
    setTerminalLogs(prev => [
      ...prev,
      `Forcing reboot into TWRP/Lineage Recovery via hardware keys...`,
      `Recovery booted. Now tap 'Format Data / Factory Reset' to fix encryption!`
    ]);
    setStage('recovery_menu');
  };

  // COMPLETE WORKBENCH SESSION
  const handleFinishWorkbench = () => {
    if (!activeCard || !currentPhone || !selectedRom) return;

    const reward = Math.floor(currentPhone.basePrice * selectedRom.sellMultiplier);
    setCoins(prev => prev + reward);
    setCollection(prev =>
      prev.map(c =>
        c.instanceId === activeCard.instanceId
          ? {
              ...c,
              flashed: true,
              flashedRom: selectedRom.name,
              sellMultiplier: selectedRom.sellMultiplier
            }
          : c
      )
    );
    setStats(s => ({ ...s, totalFlashed: s.totalFlashed + 1 }));
    setActiveCard(null);
    playSound(1174, 'triangle', 0.35);
    triggerHaptic('success');
    showToast(`🎉 ${selectedRom.name} installed successfully! +${reward} coins earned!`);
  };

  // Valuation calculation for profile
  const totalWorkshopValuation =
    coins +
    collection.reduce((acc, card) => {
      const phone = PHONES.find(p => p.id === card.phoneId);
      if (!phone) return acc;
      const mult = card.flashed ? (card.sellMultiplier || 1.5) : 1.0;
      return acc + Math.floor(phone.basePrice * mult);
    }, 0);

  // Layout classes
  const containerWidthClass = isDesktopWide ? 'max-w-6xl' : 'max-w-md';
  const blurBackdropClass = blurEnabled ? 'backdrop-blur-md bg-slate-900/90' : 'bg-slate-900';

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20 ${!blurEnabled ? 'no-blur' : ''}`}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-3 left-1/2 -translate-x-1/2 z-50 border border-cyan-500/50 text-cyan-300 px-4 py-2 rounded-full shadow-2xl ${blurEnabled ? 'backdrop-blur-md bg-slate-900/95' : 'bg-slate-900'} text-xs font-bold flex items-center gap-2 animate-bounce`}>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER - CLEAN & WITHOUT INTRUSIVE TELEGRAM ADMIN LABEL */}
      <header className={`sticky top-0 z-40 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between ${blurBackdropClass}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
              FLASHER WORKSHOP
              <span className="text-[9px] uppercase font-mono px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Real-world bootloader & firmware simulator</p>
          </div>
        </div>

        {/* Virtual Coins Badge */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-inner">
          <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-black text-amber-300 font-mono">{coins}</span>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className={`${containerWidthClass} w-full mx-auto px-3.5 pt-3 flex-1 flex flex-col gap-3 transition-all duration-300`}>
        {/* TAB 1: WORKBENCH / COLLECTION */}
        {activeTab === 'collection' && (
          <div className="flex flex-col gap-3">
            {/* Disclaimer Banner */}
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-amber-200/90 leading-snug">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Educational Simulator:</strong> True hardware mechanics! iPhones lack Fastboot (DFU checkm8 only), Xiaomi requires Mi Unlock Tool, and flashing without formatting /data triggers real bootloops!
              </span>
            </div>

            {/* Random Card Claim */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-white">Receive New Hardware Device</h3>
                  <p className="text-[11px] text-slate-400">Random smartphone every 3 hours from 15 real-world models in authentic 20:9 chassis.</p>
                </div>
                {cooldownRemaining > 0 ? (
                  <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 flex items-center gap-1">
                    <span>⏳</span>
                    <span>{formatCooldownTimer(cooldownRemaining)}</span>
                  </span>
                ) : (
                  <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    READY
                  </span>
                )}
              </div>
              <button
                onClick={handleClaim}
                disabled={cooldownRemaining > 0}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  cooldownRemaining > 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/20 active:scale-95'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                {cooldownRemaining > 0 ? `Next Device in: ${formatCooldownTimer(cooldownRemaining)}` : '⚡ Claim Random Device!'}
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between mt-1">
              <h2 className="text-xs font-bold text-slate-300">My Devices ({collection.length})</h2>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                {(['all', 'flashed', 'stock'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                      filter === f ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Phones Grid */}
            {collection.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                <Smartphone className="w-10 h-10 stroke-[1.5] text-slate-600" />
                <p className="text-xs font-bold text-slate-300">Workbench is empty</p>
                <p className="text-[11px]">Claim your first smartphone above or purchase one from the Store!</p>
              </div>
            ) : (
              <div className={`grid ${isDesktopWide ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-3`}>
                {collection
                  .filter(c => (filter === 'all' ? true : filter === 'flashed' ? c.flashed : !c.flashed))
                  .map(card => {
                    const phone = PHONES.find(p => p.id === card.phoneId);
                    if (!phone) return null;

                    const mult = card.flashed ? (card.sellMultiplier || 1.5) : 1.0;
                    const sellPrice = Math.floor(phone.basePrice * mult);

                    return (
                      <div
                        key={card.instanceId}
                        onClick={() => openFlashLab(card)}
                        className={`bg-slate-900/90 border rounded-2xl p-3 flex flex-col gap-2.5 transition-all hover:border-cyan-500/60 cursor-pointer shadow-md ${
                          card.flashed ? 'border-emerald-500/40' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{phone.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-white">{phone.name}</h4>
                                <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                                  {phone.codename}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">{phone.soc}</p>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              card.flashed
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {card.flashed ? `✨ ${card.flashedRom || 'Modded'}` : '⚙️ Stock'}
                          </span>
                        </div>

                        {/* Specs & Valuation */}
                        <div className="flex items-center justify-between bg-slate-950/60 rounded-xl px-2.5 py-1.5 text-[11px] border border-slate-800/80">
                          <div className="flex items-center gap-1 text-slate-400">
                            <span>Base:</span>
                            <span className="font-mono text-slate-300 font-bold">{phone.basePrice}🪙</span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <span>Value:</span>
                            <span className="font-mono font-bold text-amber-300">{sellPrice}🪙</span>
                            {card.flashed && <span className="text-[9px] font-mono text-emerald-400">({mult}x)</span>}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openFlashLab(card);
                            }}
                            className="py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>{card.flashed ? 'Re-Flash' : 'To Workbench'}</span>
                          </button>
                          <button
                            onClick={e => handleSell(card.instanceId, e)}
                            className="py-1.5 rounded-lg bg-slate-800 hover:bg-amber-950/40 text-slate-300 hover:text-amber-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>Sell ({sellPrice}🪙)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STORE */}
        {activeTab === 'shop' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
              <h3 className="text-xs font-bold text-white">Hardware Store</h3>
              <p className="text-[11px] text-slate-400">Purchase specific smartphone hardware for experiments.</p>
            </div>

            <div className={`grid ${isDesktopWide ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} gap-3`}>
              {PHONES.map(phone => {
                const cost = phone.basePrice * 2;
                const canAfford = coins >= cost;

                return (
                  <div key={phone.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{phone.emoji}</span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{phone.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{phone.soc}</span>
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {phone.rarity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/80 rounded-xl px-2.5 py-1.5 text-xs border border-slate-800">
                      <span className="text-slate-400">Price:</span>
                      <span className="font-mono font-bold text-amber-300">{cost}🪙</span>
                    </div>

                    <button
                      onClick={() => handleBuy(phone)}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/10'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{canAfford ? 'Purchase' : 'Insufficient Coins'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: USER PROFILE & CAREER STATS */}
        {activeTab === 'profile' && (
          <div className="flex flex-col gap-3">
            {/* User Identity Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 overflow-hidden flex-shrink-0">
                  {tgUser?.photo_url ? (
                    <img src={tgUser.photo_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-cyan-400 font-black text-xl">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      {tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : 'Flasher Developer'}
                    </h3>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {isTelegram ? 'TG MINI APP' : 'WEB CLIENT'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {tgUser
                      ? tgUser.username
                        ? `@${tgUser.username} • ID: ${tgUser.id}`
                        : `Telegram ID: ${tgUser.id}`
                      : 'Telegram ID: 7674443928 (Synced)'}
                  </p>
                  <p className="text-[10px] text-cyan-400 font-semibold mt-0.5">
                    {isAdmin ? 'Workshop Master & Superadmin 🛡️' : 'Senior Kernel Tinkerer & ROM Maintainer'}
                  </p>
                </div>
              </div>
            </div>

            {/* Career Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Devices Owned</span>
                <span className="text-xl font-black text-white font-mono">{collection.length}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ROMs Flashed</span>
                <span className="text-xl font-black text-cyan-400 font-mono">{stats.totalFlashed}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bootloops Solved</span>
                <span className="text-xl font-black text-amber-400 font-mono">{stats.bootloopsRescued}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">EDL Unbricks</span>
                <span className="text-xl font-black text-red-400 font-mono">{stats.hardBricksRescued}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mi Unlocks</span>
                <span className="text-xl font-black text-orange-400 font-mono">{stats.miUnlockedCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workshop Net Worth</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{totalWorkshopValuation}🪙</span>
              </div>
            </div>

            {/* Achievements Showcase */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Workshop Badges & Milestones
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <span className="text-xl">🍏</span>
                  <div>
                    <h5 className="font-bold text-white text-[11px]">checkm8 Exploiter</h5>
                    <p className="text-[10px] text-slate-400">Jailbroke Apple device via DFU & PongoOS</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <span className="text-xl">🔓</span>
                  <div>
                    <h5 className="font-bold text-white text-[11px]">Mi Unlock Veteran</h5>
                    <p className="text-[10px] text-slate-400">Bypassed Xiaomi 168-hour bootloader lock</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <span className="text-xl">🔄</span>
                  <div>
                    <h5 className="font-bold text-white text-[11px]">Bootloop Survivor</h5>
                    <p className="text-[10px] text-slate-400">Repaired encrypted userdata via /data wipe</p>
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
                  <span className="text-xl">🛠️</span>
                  <div>
                    <h5 className="font-bold text-white text-[11px]">EDL 9008 Necromancer</h5>
                    <p className="text-[10px] text-slate-400">Rescued hard-bricked Snapdragon SoC</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences & Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Preferences & Display Settings
              </h4>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <div>
                  <h5 className="text-xs font-bold text-white">Laptop / Desktop Wide View</h5>
                  <p className="text-[11px] text-slate-400">Full width workspace for large monitors</p>
                </div>
                <button
                  onClick={() => setIsDesktopWide(prev => !prev)}
                  className={`p-2 rounded-xl border transition-all ${
                    isDesktopWide
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {isDesktopWide ? <Monitor className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <div>
                  <h5 className="text-xs font-bold text-white">Backdrop Blur Effect</h5>
                  <p className="text-[11px] text-slate-400">Turn off to improve rendering performance</p>
                </div>
                <button
                  onClick={() => setBlurEnabled(prev => !prev)}
                  className={`p-2 rounded-xl border transition-all ${
                    blurEnabled
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {blurEnabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                <div>
                  <h5 className="text-xs font-bold text-white">Synthesizer Sound Effects</h5>
                  <p className="text-[11px] text-slate-400">Device boot chimes & button clicks</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(prev => !prev)}
                  className={`p-2 rounded-xl border transition-all ${
                    soundEnabled
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Developer Fast-Tracks */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-300">🛠️ Developer Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem('flasher_last_claim_timestamp');
                    } catch {}
                    setCooldownRemaining(0);
                    showToast('⏱️ Cooldown reset (ready to claim)!');
                    playSound(600, 'sine', 0.05);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-left font-semibold"
                >
                  ⏱️ Reset Cooldown
                </button>
                <button
                  onClick={() => {
                    setCoins(prev => prev + 1000);
                    showToast('🪙 +1000 Coins added!');
                    playSound(750, 'triangle', 0.08);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 text-left font-semibold"
                >
                  🪙 +1000 Coins
                </button>
                <button
                  onClick={() => {
                    setCollection(prev => prev.map(c => ({ ...c, flashed: true, sellMultiplier: 2.0 })));
                    showToast('⚡ All devices marked as Flashed!');
                    playSound(900, 'sine', 0.1);
                  }}
                  className="p-2 rounded-xl bg-slate-800 text-emerald-300 border border-slate-700 text-left font-semibold"
                >
                  ⚡ Flash All
                </button>
                <button
                  onClick={() => {
                    setCollection([]);
                    showToast('🗑️ Collection cleared');
                    playSound(300, 'sawtooth', 0.1);
                  }}
                  className="p-2 rounded-xl bg-red-950/60 text-red-300 border border-red-800/60 text-left font-semibold"
                >
                  🗑️ Clear Collection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADMIN CONTROLS */}
        {activeTab === 'admin' && (
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">Workshop Administration</h3>
                <p className="text-[11px] text-slate-400">Authorized for Telegram ID: 7674443928</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                ADMIN ACTIVE
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-300">Broadcast Global Announcement</h4>
              <textarea
                placeholder="Enter notice to all connected workshops..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 h-20 resize-none font-mono"
              />
              <button
                onClick={() => {
                  showToast('📢 Global broadcast sent!');
                  playSound(880, 'triangle', 0.1);
                }}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all"
              >
                Send Broadcast
              </button>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          AUTHENTIC FULL-WIDTH WORKBENCH MODAL:
          TALL 20:9 SMARTPHONE CHASSIS, NO CUT-OFF EDGES ON LAPTOPS
         ========================================================================= */}
      {activeCard && currentPhone && (
        <div className={`fixed inset-0 z-50 ${blurEnabled ? 'backdrop-blur-md bg-black/90' : 'bg-black/98'} flex items-center justify-center p-2 sm:p-5 animate-fadeIn`}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[96vw] xl:max-w-7xl h-[94vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b border-slate-800 ${blurEnabled ? 'backdrop-blur-md bg-slate-950/80' : 'bg-slate-950'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentPhone.emoji}</span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {currentPhone.name}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {currentPhone.codename}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">({currentPhone.soc})</span>
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span className="text-cyan-400">
                      {currentPhone.brand === 'Apple' ? 'APPLE CHECKM8 • RECOVERY/DFU' : 'ANDROID BOOTLOADER / FASTBOOT'}
                    </span>
                    <span>•</span>
                    <span className={isDataWiped ? 'text-emerald-400' : 'text-amber-400'}>
                      Data Wipe: {isDataWiped ? 'Clean (ext4 ready)' : 'Dirty (Bootloop risk!)'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (stage === 'flashing_rom' || stage === 'jailbreaking') {
                    triggerHardBrick();
                  } else {
                    setActiveCard(null);
                  }
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* WORKBENCH BODY: 3-COLUMN OR EXPANSIVE 2-COLUMN ON LAPTOPS */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* COLUMN 1: TALL 20:9 SMARTPHONE HARDWARE CHASSIS */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center py-2">
                <div className="relative">
                  {/* Left Hardware Buttons (Vol Up / Vol Down) */}
                  <div className="absolute -left-3.5 top-24 flex flex-col gap-3 z-20">
                    <button
                      onMouseDown={startHoldingButtons}
                      onMouseUp={stopHoldingButtons}
                      onTouchStart={startHoldingButtons}
                      onTouchEnd={stopHoldingButtons}
                      className="w-3 h-12 bg-slate-700 hover:bg-cyan-500 rounded-l-md active:bg-cyan-400 transition-colors cursor-pointer shadow-md"
                      title="Vol Up"
                    />
                    <button
                      onMouseDown={startHoldingButtons}
                      onMouseUp={stopHoldingButtons}
                      onTouchStart={startHoldingButtons}
                      onTouchEnd={stopHoldingButtons}
                      className="w-3 h-12 bg-slate-700 hover:bg-cyan-500 rounded-l-md active:bg-cyan-400 transition-colors cursor-pointer shadow-md"
                      title="Vol Down"
                    />
                  </div>

                  {/* Right Hardware Button (Power - triggers hard brick if pressed during flash!) */}
                  <div className="absolute -right-3.5 top-28 flex flex-col gap-2 z-20">
                    <button
                      onMouseDown={startHoldingButtons}
                      onMouseUp={stopHoldingButtons}
                      onTouchStart={startHoldingButtons}
                      onTouchEnd={stopHoldingButtons}
                      className="w-3 h-14 bg-slate-700 hover:bg-red-500 rounded-r-md active:bg-red-400 transition-colors cursor-pointer shadow-md"
                      title="Power Button (Cutting power during flash = Hard Brick!)"
                    />
                  </div>

                  {/* 1. APPLE IPHONE 7/8 (CLASSIC BEZELS + HOME BUTTON) */}
                  {currentPhone.chassis === 'iphone_classic' && (
                    <div className="w-[216px] bg-slate-900 border-4 border-slate-600 rounded-[44px] pt-5 pb-4 px-2.5 shadow-2xl flex flex-col items-center select-none">
                      <div className="w-full flex items-center justify-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                        <div className="w-12 h-2.5 bg-slate-800 rounded-full" />
                      </div>
                      <div className="w-full h-[340px] rounded-lg overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                      <div className="w-10 h-10 rounded-full border-2 border-slate-500 bg-slate-950 mt-3 flex items-center justify-center shadow-inner cursor-pointer active:scale-95">
                        <div className="w-7 h-7 rounded-full border border-slate-700" />
                      </div>
                    </div>
                  )}

                  {/* 2. APPLE IPHONE X (NOTCH + TALL 19.5:9 OLED) */}
                  {currentPhone.chassis === 'iphone_notch' && (
                    <div className="w-[216px] bg-slate-950 border-4 border-slate-700 rounded-[42px] p-2 shadow-2xl flex flex-col items-center select-none">
                      <div className="w-24 h-4 bg-slate-900 rounded-b-xl mx-auto mb-1 flex items-center justify-center gap-2 px-2 z-10">
                        <div className="w-2 h-2 rounded-full bg-slate-950" />
                        <div className="w-8 h-1.5 bg-slate-800 rounded-full" />
                      </div>
                      <div className="w-full h-[350px] rounded-[28px] overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                      <div className="w-20 h-1 bg-slate-600 rounded-full mx-auto mt-2" />
                    </div>
                  )}

                  {/* 3. SAMSUNG GALAXY S10 (INFINITY-O + CURVED) */}
                  {currentPhone.chassis === 'samsung_infinity' && (
                    <div className="w-[216px] bg-slate-950 border-x-4 border-y-2 border-slate-700 rounded-[36px] p-2 shadow-2xl flex flex-col items-center select-none">
                      <div className="w-full flex justify-end pr-3 mb-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />
                      </div>
                      <div className="w-full h-[350px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                    </div>
                  )}

                  {/* 4. GOOGLE PIXEL (TALL 20:9 + CENTER PUNCH HOLE) */}
                  {currentPhone.chassis === 'pixel_visor' && (
                    <div className="w-[216px] bg-slate-950 border-4 border-slate-700 rounded-[34px] p-2 shadow-2xl flex flex-col items-center select-none">
                      <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800 mx-auto mb-1" />
                      <div className="w-full h-[350px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                    </div>
                  )}

                  {/* 5. NOTHING PHONE (1) (FLAT EDGES + GLYPH LED ACCENT) */}
                  {currentPhone.chassis === 'nothing_glyph' && (
                    <div className="w-[216px] bg-slate-950 border-4 border-slate-600 rounded-[32px] p-2 shadow-2xl flex flex-col items-center relative select-none">
                      <div className="absolute top-1 left-3 w-8 h-0.5 bg-red-500 animate-pulse" />
                      <div className="w-3 h-3 rounded-full bg-black border border-slate-800 mx-auto mb-1" />
                      <div className="w-full h-[350px] rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                    </div>
                  )}

                  {/* 6. REDMI / POCO (TALL 20:9 WITH DISTINCT CHIN) */}
                  {currentPhone.chassis === 'redmi_chin' && (
                    <div className="w-[216px] bg-slate-950 border-4 border-slate-700 rounded-[36px] p-2 pb-3 shadow-2xl flex flex-col items-center select-none">
                      <div className="w-12 h-2 bg-slate-800 rounded-full mx-auto mb-1" />
                      <div className="w-full h-[340px] rounded-2xl overflow-hidden relative flex flex-col items-center justify-center text-center p-2 bg-black border border-slate-800">
                        {renderScreenContent()}
                      </div>
                      <div className="w-full text-center text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        {currentPhone.brand}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2 & 3: CONTROLS, ROM SELECTION & TERMINAL */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {/* ROM / FIRMWARE SELECTION */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Select Target Firmware / Jailbreak:</span>
                    <span className="text-[10px] text-cyan-400 font-mono">Higher risk = Larger coin reward</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentPhone.romOptions.map(rom => (
                      <button
                        key={rom.id}
                        disabled={stage !== 'idle' && stage !== 'recovery_menu' && stage !== 'dfu'}
                        onClick={() => {
                          setSelectedRom(rom);
                          playSound(600, 'sine', 0.04);
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          selectedRom?.id === rom.id
                            ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                            : 'bg-slate-900 border-slate-800 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rom.color }} />
                            {rom.name}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{rom.desc}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[10px]">
                          <span className="font-bold text-amber-300 font-mono">+{Math.round((rom.sellMultiplier - 1) * 100)}% 🪙 Value</span>
                          <span className="text-slate-400 font-mono">{Math.round(rom.successChance * 100)}% Success Rate</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WORKBENCH ACTIONS BAR */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Required Action:</span>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      {stage === 'idle'
                        ? currentPhone.brand === 'Apple'
                          ? 'Apple: Hold Power + Vol Down for 4s (DFU Mode)'
                          : 'Android: Hold Power + Vol Down for 3s (Fastboot)'
                        : stage === 'fastboot'
                        ? currentPhone.brand === 'Redmi' || currentPhone.brand === 'POCO'
                          ? !isBootloaderUnlocked
                            ? 'Xiaomi Bootloader Locked! Launch Mi Unlock Tool'
                            : 'Bootloader Unlocked: Run fastboot flash recovery'
                          : 'Fastboot: Flash custom recovery'
                        : stage === 'download'
                        ? 'Samsung Odin Mode: Flash recovery via Heimdall'
                        : stage === 'dfu'
                        ? 'Apple DFU: Ready for checkm8 palera1n injection'
                        : stage === 'recovery_menu'
                        ? 'Recovery: Format /data or Apply Sideload'
                        : stage === 'bootloop'
                        ? 'BOOTLOOP: Force Reboot to Recovery & Format /data!'
                        : stage === 'flashing_rom' || stage === 'jailbreaking'
                        ? '⚠️ DO NOT INTERRUPT POWER (BRICK HAZARD)!'
                        : stage === 'hard_brick'
                        ? 'HARD BRICK! Execute EDL 9008 / DFU Restore'
                        : 'Flashing completed successfully!'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {/* IDLE: HOLD BUTTONS */}
                    {stage === 'idle' && (
                      <button
                        onMouseDown={startHoldingButtons}
                        onMouseUp={stopHoldingButtons}
                        onTouchStart={startHoldingButtons}
                        onTouchEnd={stopHoldingButtons}
                        className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-cyan-600/20"
                      >
                        <Vibrate className="w-4 h-4" />
                        <span>{currentPhone.brand === 'Apple' ? 'Hold Power + Vol Down (DFU 4s)' : 'Hold Power + Vol Down (3s)'}</span>
                      </button>
                    )}

                    {/* XIAOMI UNLOCK TOOL TRIGGER */}
                    {stage === 'fastboot' && (currentPhone.brand === 'Redmi' || currentPhone.brand === 'POCO') && !isBootloaderUnlocked && (
                      <button
                        onClick={() => setShowMiUnlockModal(true)}
                        className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-orange-600/20"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Launch Mi Flash Unlock Tool</span>
                      </button>
                    )}

                    {/* ANDROID FASTBOOT FLASH RECOVERY */}
                    {(stage === 'fastboot' || stage === 'download') && currentPhone.brand !== 'Apple' && (
                      <button
                        onClick={handleFlashRecovery}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>{currentPhone.brand === 'Samsung' ? 'heimdall flash recovery' : 'fastboot flash recovery'}</span>
                      </button>
                    )}

                    {/* RECOVERY MENU ACTIONS */}
                    {stage === 'recovery_menu' && (
                      <>
                        <button
                          onClick={handleFormatData}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isDataWiped
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
                              : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-800'
                          }`}
                        >
                          <HardDrive className="w-4 h-4" />
                          <span>{isDataWiped ? 'Data Formatted ✓' : 'Format /data (Prevents Bootloop)'}</span>
                        </button>

                        <button
                          onClick={handleStartFlashing}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/20"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>adb sideload ({selectedRom?.name})</span>
                        </button>
                      </>
                    )}

                    {/* APPLE DFU JAILBREAK START */}
                    {stage === 'dfu' && (
                      <button
                        onClick={handleStartFlashing}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/20"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>palera1n -l ({selectedRom?.name})</span>
                      </button>
                    )}

                    {/* BOOTLOOP RESCUE BUTTON */}
                    {stage === 'bootloop' && (
                      <button
                        onClick={handleRescueFromBootloop}
                        className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-600/20 animate-pulse"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reboot to Recovery & Format /data</span>
                      </button>
                    )}

                    {/* POWER INTERRUPTION HARD BRICK TEST */}
                    {(stage === 'flashing_rom' || stage === 'jailbreaking') && (
                      <button
                        onClick={triggerHardBrick}
                        className="flex-1 py-2.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                      >
                        <PowerOff className="w-4 h-4 text-red-400" />
                        <span>Disconnect Cable / Power (Test Hard Brick 💥)</span>
                      </button>
                    )}

                    {/* UNBRICK TOOL */}
                    {stage === 'hard_brick' && (
                      <button
                        onClick={handleUnbrick}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Emergency Unbrick (EDL 9008 / DFU Restore)</span>
                      </button>
                    )}

                    {/* FINISH BUTTON */}
                    {stage === 'complete' && (
                      <button
                        onClick={handleFinishWorkbench}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save Device & Collect Bounty</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* LIVE LINUX TERMINAL BOX */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-[11px] shadow-lg flex-1 flex flex-col">
                  <div className="bg-slate-900 px-3.5 py-2 flex items-center justify-between border-b border-slate-800 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="ml-1 text-slate-300 font-bold">bash — linux: ~/platform-tools</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {currentPhone.brand === 'Apple' ? 'USBMUXD: READY' : 'USB 2.0: FASTBOOT/ADB'}
                    </span>
                  </div>

                  <div className="p-3.5 max-h-48 overflow-y-auto space-y-1 text-cyan-300 font-mono">
                    {terminalLogs.map((log, idx) => (
                      <div key={idx} className="leading-snug break-words">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XIAOMI MI FLASH UNLOCK TOOL MODAL */}
      {showMiUnlockModal && (
        <div className={`fixed inset-0 z-50 ${blurEnabled ? 'backdrop-blur-md bg-black/80' : 'bg-black/95'} flex items-center justify-center p-4`}>
          <div className="bg-slate-900 border border-orange-500/50 rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Mi Flash Unlock Tool v6.5</h4>
                  <p className="text-[10px] text-orange-400 font-mono">Xiaomi Global Bootloader Verification</p>
                </div>
              </div>
              <button
                onClick={() => setShowMiUnlockModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Device Codename:</span>
                <span className="text-white font-bold">{currentPhone?.codename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mi Account ID:</span>
                <span className="text-cyan-400">xiaomi_dev_7674443928</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">168h Waiting Period:</span>
                <span className="text-emerald-400">Bypassed (Dev Token)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Check:</span>
                <span className="text-emerald-400">PASSED</span>
              </div>
            </div>

            {isMiUnlocking && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-orange-400">
                  <span>Executing fastboot oem unlock...</span>
                  <span>{miUnlockProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-orange-950">
                  <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${miUnlockProgress}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={runMiUnlockTool}
              disabled={isMiUnlocking}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isMiUnlocking
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 active:scale-95'
              }`}
            >
              <Unlock className="w-4 h-4" />
              <span>{isMiUnlocking ? 'Unlocking Bootloader...' : 'Unlock Bootloader Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION DOCK (TELEGRAM MINI APP STYLE) */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 ${containerWidthClass} mx-auto px-4 py-2 flex items-center justify-between ${blurBackdropClass}`}>
        <button
          onClick={() => {
            setActiveTab('collection');
            playSound(500, 'sine', 0.04);
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'collection' ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px]">Workbench</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('shop');
            playSound(500, 'sine', 0.04);
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'shop' ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Store</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            playSound(500, 'sine', 0.04);
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'profile' ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('admin');
            playSound(500, 'sine', 0.04);
          }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'admin' ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px]">Admin</span>
        </button>
      </nav>
    </div>
  );

  // ACCURATE SMARTPHONE DISPLAY RENDERING
  function renderScreenContent() {
    if (!currentPhone) return null;
    const isApple = currentPhone.brand === 'Apple';

    // 1. IDLE STATE
    if (stage === 'idle') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-blue-950 to-slate-950 text-white flex flex-col items-center justify-center p-3">
          {isApple ? (
            <div className="text-4xl font-serif text-white mb-2 drop-shadow"></div>
          ) : (
            <Lock className="w-7 h-7 text-slate-400 mb-2" />
          )}
          <span className="text-xs font-mono font-bold">{isApple ? 'iOS Stock' : 'Stock OS'}</span>
          <span className="text-[10px] text-slate-400 mt-1">USB Cable Connected</span>
          <span className="text-[8px] text-slate-500 font-mono mt-3">
            {isApple ? 'Hold Power + Vol Down (DFU 4s)' : 'Hold Power + Vol Down (Fastboot 3s)'}
          </span>
        </div>
      );
    }

    // 2. HOLDING BUTTONS PROGRESS
    if (stage === 'holding_buttons') {
      return (
        <div className="w-full h-full bg-black text-cyan-300 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-cyan-400 animate-spin mb-2" />
          <span className="text-xs font-bold font-mono">Holding {holdingSeconds}s</span>
          <span className="text-[9px] text-slate-400 mt-0.5">Do not release buttons!</span>
        </div>
      );
    }

    // 3. ANDROID FASTBOOT (NEVER SHOWN ON IPHONE!)
    if (stage === 'fastboot') {
      return (
        <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col justify-between p-3 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-300">
            <span>🤖</span>
            <span>FASTBOOT MODE</span>
          </div>
          <div className="text-[8px] text-green-500/80 space-y-0.5 my-auto">
            <div>PRODUCT: {currentPhone.codename}</div>
            <div>
              BOOTLOADER: {isBootloaderUnlocked ? <span className="text-green-300">UNLOCKED 🔓</span> : <span className="text-red-400">LOCKED 🔒</span>}
            </div>
            <div>HW_REV: 0x10</div>
            <div>SECURE_BOOT: ENABLED</div>
          </div>
          <div className="text-[8px] text-green-300 animate-pulse text-center">
            {isBootloaderUnlocked ? 'READY FOR FASTBOOT' : 'MI UNLOCK REQUIRED'}
          </div>
        </div>
      );
    }

    // 4. SAMSUNG DOWNLOAD MODE
    if (stage === 'download') {
      return (
        <div className="w-full h-full bg-teal-800 text-white font-sans flex flex-col items-center justify-center p-2 text-center">
          <span className="text-3xl mb-1">📥</span>
          <span className="text-xs font-black tracking-wider uppercase">Downloading...</span>
          <span className="text-[9px] text-teal-200 mt-0.5">Do not turn off target!!</span>
          <div className="w-20 bg-teal-950 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-white h-full w-2/3 animate-pulse" />
          </div>
        </div>
      );
    }

    // 5. APPLE DFU MODE (AUTHENTIC OLED PURE BLACK SCREEN)
    if (stage === 'dfu') {
      return (
        <div className="w-full h-full bg-black text-slate-700 flex flex-col items-center justify-center p-2">
          <span className="text-[9px] font-mono tracking-widest text-slate-800">[ APPLE DFU MODE ]</span>
          <span className="text-[8px] text-slate-600 mt-1">checkm8 Bootrom Exploit Primed</span>
          <span className="text-[7px] text-slate-700 mt-0.5">Screen Pitch Black by Design</span>
        </div>
      );
    }

    // 6. ANDROID RECOVERY MENU (TOUCH-RESPONSIVE)
    if (stage === 'recovery_menu') {
      return (
        <div className="w-full h-full bg-slate-950 border border-cyan-800 text-white flex flex-col justify-between p-2.5 font-mono text-[9px]">
          <div className="bg-cyan-900/60 text-cyan-300 font-bold py-1 rounded text-center">
            TWRP / Lineage Recovery 21
          </div>
          <div className="flex flex-col gap-1.5 my-auto">
            <button
              onClick={handleFormatData}
              className={`py-1.5 px-2 rounded text-left flex items-center justify-between border ${
                isDataWiped
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-slate-900 text-amber-300 border-amber-800/60 hover:bg-slate-800'
              }`}
            >
              <span>› {isDataWiped ? 'Data Formatted ✓' : 'Format Data (Prevent Bootloop)'}</span>
              <span className="text-[8px]">{isDataWiped ? '✓' : '⚙️'}</span>
            </button>
            <button
              onClick={handleStartFlashing}
              className="py-1.5 px-2 bg-slate-800 hover:bg-cyan-700 text-cyan-300 rounded text-left flex items-center justify-between border border-cyan-700/50"
            >
              <span>› Apply update from ADB (Sideload)</span>
              <span className="text-[8px]">▶</span>
            </button>
          </div>
          <span className="text-[8px] text-slate-500 text-center">Tap button or use workbench</span>
        </div>
      );
    }

    // 7. FLASHING / JAILBREAKING PROGRESS
    if (stage === 'flashing_rom' || stage === 'jailbreaking') {
      return (
        <div className="w-full h-full bg-black text-white font-mono flex flex-col items-center justify-center p-3">
          {isApple ? (
            <>
              <div className="text-4xl font-serif text-white mb-2 animate-pulse"></div>
              <span className="text-[10px] text-slate-400 font-mono">PongoOS checkm8 Injection...</span>
            </>
          ) : (
            <>
              <Zap className="w-7 h-7 text-cyan-400 mb-2 animate-bounce" />
              <span className="text-xs font-bold text-center text-cyan-300">{selectedRom?.name}</span>
            </>
          )}
          <div className="w-36 bg-slate-800 h-2 rounded-full mt-3 overflow-hidden border border-slate-700">
            <div className="bg-cyan-400 h-full transition-all duration-100" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[9px] font-mono text-cyan-400 mt-1">{progressPct}% Sideloading</span>
        </div>
      );
    }

    // 8. BOOTING ANIMATION (APPLE LOGO VS ANDROID LOGO)
    if (stage === 'booting') {
      return (
        <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center p-3">
          {isApple ? (
            <>
              <div className="text-5xl font-serif text-white mb-3"></div>
              <div className="w-24 bg-slate-800 h-1 rounded-full overflow-hidden mb-2">
                <div className="bg-white h-full w-4/5 animate-pulse" />
              </div>
              <span className="text-[9px] text-slate-400 font-mono">Booting Darwin XNU Kernel...</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin mb-3" />
              <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">{selectedRom?.name || 'Android'}</span>
            </>
          )}
        </div>
      );
    }

    // 9. REALISTIC BOOTLOOP SCREEN
    if (stage === 'bootloop') {
      return (
        <div className="w-full h-full bg-black text-amber-400 font-mono flex flex-col items-center justify-center p-3 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-2" />
          <span className="text-xs font-black text-amber-400">BOOTLOOP ENCOUNTERED</span>
          <span className="text-[8px] text-amber-200 mt-1.5 leading-snug">
            Encrypted /data partition mismatch! Init service crashed.
          </span>
          <span className="text-[7px] text-amber-500 mt-2 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
            Reboot to Recovery & Format /data
          </span>
        </div>
      );
    }

    // 10. HARD BRICK CRASHDUMP
    if (stage === 'hard_brick') {
      return (
        <div className="w-full h-full bg-red-950 text-red-200 font-mono flex flex-col items-center justify-center p-3 text-center">
          <XCircle className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
          <span className="text-xs font-black text-red-400 uppercase tracking-wide">
            {isApple ? 'APPLE DFU RESTORE' : 'QUALCOMM CRASHDUMP'}
          </span>
          <span className="text-[8px] text-red-300 mt-1">EDL 9008 / AP Ticket Panic</span>
          <span className="text-[7px] text-red-400 mt-1 bg-red-900/60 px-2 py-0.5 rounded border border-red-700">
            Use Emergency Unbrick
          </span>
        </div>
      );
    }

    // 11. COMPLETE STATE (APPLE LOCKSCREEN WITH SILEO / ANDROID HOMESCREEN)
    if (stage === 'complete') {
      return (
        <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex flex-col justify-between p-3 select-none">
          {isApple ? (
            <>
              {/* Apple Lockscreen with Sileo */}
              <div className="flex justify-between items-center text-[9px] text-slate-300 font-medium px-1">
                <span>9:41</span>
                <span>📶 5G 🔋 100%</span>
              </div>
              <div className="my-auto flex flex-col items-center">
                <span className="text-3xl font-light tracking-tight">9:41</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Wednesday, October 21</span>
                <div className="mt-4 flex items-center gap-2 bg-slate-900/90 border border-cyan-500/50 rounded-xl px-2.5 py-1.5 shadow-lg">
                  <div className="w-4 h-4 rounded-md bg-cyan-500 flex items-center justify-center text-slate-950 text-[10px] font-bold">
                    S
                  </div>
                  <span className="text-[10px] font-bold text-cyan-300">Sileo & Zebra Active</span>
                </div>
              </div>
              <span className="text-[8px] text-slate-500 text-center font-mono">Swipe up to unlock</span>
            </>
          ) : (
            <>
              {/* Android Modded Home */}
              <div className="flex justify-between items-center text-[9px] text-slate-300 font-mono px-1">
                <span>12:00</span>
                <span>LTE 🔋 100%</span>
              </div>
              <div className="my-auto flex flex-col items-center text-center">
                <Sparkles className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-xs font-black text-emerald-300">{selectedRom?.name}</span>
                <span className="text-[9px] text-slate-400 mt-1">Booted cleanly with ext4 userdata</span>
                <span className="text-[8px] text-emerald-400 font-mono mt-1.5 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  SELinux: Enforcing
                </span>
              </div>
              <span className="text-[8px] text-slate-500 text-center font-mono">System Ready</span>
            </>
          )}
        </div>
      );
    }

    return null;
  }
}
