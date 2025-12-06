
import React from "react";

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
  day?: string;
}

interface Match {
  _id: string;
  matchName?: string;
  matchNo?: number;
  _matchNo?: number;
}

interface LowerProps {
  tournament: Tournament;
  round?: Round | null;
  match?: Match | null;
}

export default function Lower({ tournament, round, match }: LowerProps) {
  // Safe match number
  const matchNumber = match?.matchNo ?? match?._matchNo ?? "N/A";

  return (
    <div className="flex items-end w-[1920px] h-[1080px]">
      <div className="mb-[100px]">
        <div
          className="top-[100px] w-[560px] h-[180px] flex shadow-xl justify-between relative bg-gradient-to-r from-[#d3d3d3] to-white"
          style={{ backgroundColor: tournament.primaryColor }}
        >
          {/* 🔥 Tournament Name Box */}
          <div
            className="bg-black text-[2.5rem] font-[500] px-6 rounded uppercase w-fit tracking-wide absolute top-[-23px] z-[999] right-6 text-white shadow-xl font-[righteous] skew-x-12"
            style={{
              backgroundColor: tournament.secondaryColor,
              color: "white",
            }}
          >
            {tournament.tournamentName}
          </div>

          {/* 🔥 Logo */}
          <div className="w-max h-full flex items-center justify-center">
            <img
              src={tournament.torLogo}
              alt="Logo"
              className="h-full aspect-square object-contain"
            />
          </div>

          {/* 🔥 Match + Day Box */}
          <div
            className="w-4/6 h-full flex flex-col justify-center items-end px-4 text-white skew-x-12"
            style={{
              clipPath:
                "polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%, 20% 30%, 0% 60%)",
              backgroundColor: tournament.primaryColor,
            }}
          >
            <div className="flex flex-col">
              {/* 🔥 Match Number */}
              <div className="text-[6.2rem] font-bebas relative top-[20px] text-white">
                Match {matchNumber}
              </div>

              {/* 🔥 Day & Round */}
              <div
                className="bg-black text-[1.1rem] font-[500] rounded uppercase w-[210px] h-[35px] font-[righteous] text-center top-[-18px] left-[20px] relative text-white pt-[4px]"
                style={{
                  backgroundColor: tournament.secondaryColor,
                  color: "white",
                }}
              >
                DAY {round?.day} - {round?.roundName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
