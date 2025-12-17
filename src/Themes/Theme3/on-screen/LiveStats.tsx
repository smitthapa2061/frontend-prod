import React, { useEffect, useState, useMemo } from 'react';

interface Tournament {
  _id: string;
  tournamentName: string;
  torLogo?: string;
  day?: string;
  primaryColor?: string;
  secondaryColor?: string;
  overlayBg?: string;
}

interface Round {
  _id: string;
  roundName: string;
  apiEnable?: boolean;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface Player {
  _id: string;
  playerName: string;
  killNum: number;
  bHasDied: boolean;
  picUrl?: string;
  
  // Live stats fields
  health: number;
  healthMax: number;
  liveState: number; // 0 = knocked, 5 = dead, etc.
}

interface Team {
  _id: string;
  teamId?: string;
  teamTag: string;
  slot?: number;
  placePoints: number;
  players: Player[];
  teamLogo: string;
}

interface MatchData {
  _id: string;
  teams: Team[];
}

interface LiveStatsProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
  matchData?: MatchData | null;
  overallData?: any;
}

const LiveStats: React.FC<LiveStatsProps> = ({ tournament, round, match, matchData, overallData }) => {
  const [localMatchData, setLocalMatchData] = useState<MatchData | null>(matchData || null);
  const [overallMap, setOverallMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (matchData) {
      setLocalMatchData(matchData);
    }
  }, [matchData]);

  useEffect(() => {
    if (overallData && Array.isArray(overallData.teams) && match?.matchNo !== 1) {
      const map = new Map<string, any>();
      for (const t of overallData.teams) {
        const key = t.teamId?.toString?.() || t.teamId;
        if (!key) continue;
        map.set(key, {
          placePoints: t.placePoints || 0,
          players: Array.isArray(t.players) ? t.players : [],
        });
      }
      setOverallMap(map);
    } else {
      setOverallMap(new Map());
    }
  }, [overallData, match?.matchNo]);

  const sortedTeams = useMemo(() => {
    if (!localMatchData) return [];
    
    return localMatchData.teams
      .map(team => {
        const teamKey = (team as any).teamId?.toString?.() || (team as any).teamId || team._id;
        const overall = overallMap.get(teamKey);
        const liveKills = team.players.reduce((sum, p) => sum + (p.killNum || 0), 0);
        const overallKills = overall && Array.isArray(overall.players)
          ? overall.players.reduce((s: number, p: any) => s + (p.killNum || 0), 0)
          : 0;
        const totalPoints = (match?.matchNo === 1 ? 0 : (overall?.placePoints || 0)) + (team.placePoints || 0) + liveKills + (match?.matchNo === 1 ? 0 : overallKills);
        const isAllDead = team.players.every(player => player.liveState === 5 || player.bHasDied);

        return {
          ...team,
          totalKills: liveKills,
          alive: team.players.filter(p => p.liveState !== 5).length,
          totalPoints,
          isAllDead,
        } as any;
      })
      .sort((a: any, b: any) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.totalKills - a.totalKills;
      });
  }, [localMatchData, overallMap, match?.matchNo]);

  if (!localMatchData) {
    return (
      <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="1600" y="350" fontFamily="Arial" fontSize="24" fill="white">No match data</text>
      </svg>
    );
  }

  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 3840 2160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="3840" height="2160" fill="#0FBF23"/>

      <path
        d="M3059 534.5L3081.14 512L3840 504V567H3059L3059 534.5Z"
        fill="url(#paint0_linear_2001_9)"
      />
      <path
        d="M3059 723.5L3081.14 746L3840 754V691H3059L3059 723.5Z"
        fill="black"
      />

      <path
        d="M3143.52 525.509H3137.35V558H3131.77V525.509H3125.6V520.556H3143.52V525.509ZM3161.92 558H3146.39V520.556H3161.77V525.509H3151.99V536.443H3160.41V541.3H3151.99V553.047H3161.92V558ZM3184.74 558H3179.19L3178.07 550.894H3171.06L3169.93 558H3164.41V557.904L3171.66 520.508H3177.54L3184.74 558ZM3177.28 546.085L3174.55 529.193L3171.8 546.085H3177.28ZM3210.51 558H3205.13V539.529C3205.13 538.556 3205.24 537.201 3205.46 535.462L3200.63 554.579H3197.78L3192.93 535.462C3193.15 537.232 3193.26 538.588 3193.26 539.529V558H3187.88V520.556H3193.16L3199.05 541.252C3199.11 541.475 3199.16 542.042 3199.19 542.951C3199.19 542.552 3199.24 541.986 3199.34 541.252L3205.22 520.556H3210.51V558Z"
        fill="white"
      />

      {/* Dynamic team data */}
      {sortedTeams.map((team, index) => (
        <g key={team._id}>
          <rect x="2953" y={567 + index * 124} width="887" height="124" fill={index % 2 === 0 ? "url(#blackGradient)" : "url(#lightGradient)"}/>
          <rect x="3059" y={567 + index * 124} width="393" height="124" fill="url(#paint2_linear_2001_9)"/>
          <rect
            x="3059"
            y={567 + index * 124}
            width="393"
            height="124"
            fill="url(#paint3_linear_2001_9)"
            fillOpacity="0.76"
          />
          <rect x="2949" y={567 + index * 124} width="10" height="124" fill="url(#paint4_linear_2001_9)"/>
          <line x1="2949" y1={567 + index * 124 + 124} x2="3840" y2={567 + index * 124 + 124} stroke="black" strokeWidth="2"/>
          <text x="3000" y={620 + index * 124} fontFamily="Arial" fontSize="48" fill="white">
            {index + 1}. {team.teamTag} - PTS: {team.totalPoints} - KILLS: {team.totalKills}
          </text>
        </g>
      ))}

      <defs>
        <linearGradient
          id="blackGradient"
          x1="3320"
          y1="567"
          x2="3320"
          y2="691"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#000"/>
          <stop offset="0.826923" stopColor=" #bd1717"/>
        </linearGradient>

        <linearGradient
          id="lightGradient"
          x1="3320"
          y1="567"
          x2="3320"
          y2="691"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bd1717"/>
          <stop offset="0.826923" stopColor="#292929"/>
        </linearGradient>

        <linearGradient
          id="paint0_linear_2001_9"
          x1="3105.73"
          y1="529.109"
          x2="3751.74"
          y2="586.34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={tournament.primaryColor || "#E01515"}/>
          <stop offset="1" stopColor={tournament.secondaryColor || "#620505"}/>
        </linearGradient>

        <linearGradient
          id="paint1_linear_2001_9"
          x1="3429"
          y1="567"
          x2="3427.5"
          y2="723"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="transparent"/>
          <stop offset="0.826923" stopColor="#888"/>
        </linearGradient>

        <linearGradient
          id="paint2_linear_2001_9"
          x1="3082.52"
          y1="616.42"
          x2="3409.97"
          y2="623.837"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={tournament.primaryColor || "#E01515"}/>
          <stop offset="1" stopColor={tournament.secondaryColor || "#620505"}/>
        </linearGradient>

        <linearGradient
          id="paint3_linear_2001_9"
          x1="2521.5"
          y1="629"
          x2="3654"
          y2="629"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0"/>
          <stop offset="1" stopColor="black"/>
        </linearGradient>

        <linearGradient
          id="paint4_linear_2001_9"
          x1="2954"
          y1="567"
          x2="2996.44"
          y2="581.583"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={tournament.primaryColor || "#DA1414"}/>
          <stop offset="1" stopColor={tournament.secondaryColor || "#4F0707"}/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default LiveStats;
