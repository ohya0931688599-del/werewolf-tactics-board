import { Moon, Users, MessageSquare, Shield, Sword, Gamepad2, PenTool, Delete } from 'lucide-react';
import { clsx } from 'clsx';
import { useSwipeable } from 'react-swipeable';
import TextareaAutosize from 'react-textarea-autosize';
import { useTacticsStore } from '../store/useTacticsStore';
import { useState } from 'react';

export const NotesBoard = () => {
  const {
    day,
    alivePlayers,
    historyNotes,
    speakOrder,
    gameMode,
    setGameMode,
    incrementDay,
    decrementDay,
    togglePlayerAlive,
    setSpeechText,
    setTagText,
    addSpeaker,
    removeSpeaker,
  } = useTacticsStore();

  const [focusedSpeechPlayerId, setFocusedSpeechPlayerId] = useState<number | null>(null);
  const [focusedTagPlayerId, setFocusedTagPlayerId] = useState<number | null>(null);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2 && Math.abs(e.deltaX) > 40) {
        incrementDay();
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2 && Math.abs(e.deltaX) > 40) {
        decrementDay();
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: true,
    delta: 40,
  });

  if (gameMode === null) {
    return (
      <div className="min-h-screen bg-wolf-dark flex flex-col items-center justify-center p-6 text-gray-100 font-sans">
        <Moon className="w-20 h-20 text-wolf-primary mb-6" />
        <h1 className="text-3xl font-bold mb-2">狼人殺戰術筆記</h1>
        <p className="text-gray-400 mb-12 text-center text-sm">請選擇您的使用模式</p>
        
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button
            onClick={() => setGameMode('online')}
            className="flex items-center justify-center gap-3 bg-wolf-primary text-white py-4 px-6 rounded-2xl text-lg font-bold shadow-[0_0_20px_rgba(108,92,231,0.4)] hover:scale-105 transition-transform"
          >
            <Gamepad2 className="w-6 h-6" />
            面殺連線 (同步伺服器)
          </button>
          
          <button
            onClick={() => setGameMode('manual')}
            className="flex items-center justify-center gap-3 bg-gray-800 text-gray-200 border border-gray-700 py-4 px-6 rounded-2xl text-lg font-bold hover:bg-gray-700 hover:scale-105 transition-transform"
          >
            <PenTool className="w-6 h-6" />
            手動紀錄 (看影片複盤)
          </button>
        </div>
      </div>
    );
  }

  const currentDayNotes = historyNotes[day] || {};
  const currentOrder = speakOrder[day] || [];
  const orderedPlayers = [
    ...currentOrder,
    ...Array.from({ length: 12 }, (_, i) => i + 1).filter(id => !currentOrder.includes(id))
  ];

  const customKeyboardTags = ['金水', '銀水', '查殺', '警徽', '雙金', '單飛', '悍跳', '退水', '重打', '輕踩', '鐵保', '微保'];
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const appendTag = (text: string) => {
    if (focusedTagPlayerId) {
      const current = currentDayNotes[focusedTagPlayerId]?.tagText || '';
      setTagText(focusedTagPlayerId, current + text);
    }
  };

  const backspaceTag = () => {
    if (focusedTagPlayerId) {
      const current = currentDayNotes[focusedTagPlayerId]?.tagText || '';
      setTagText(focusedTagPlayerId, current.slice(0, -1));
    }
  };

  return (
    <div className="min-h-screen bg-wolf-dark flex flex-col relative pb-48 font-sans text-gray-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-wolf-panel border-b border-gray-700/50 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
              <Moon className="w-6 h-6 text-wolf-primary" />
              <span>戰術筆記</span>
            </h1>
            <div className="flex items-center gap-3 text-sm font-medium">
              <div className="flex items-center gap-1.5 text-wolf-warning bg-wolf-warning/10 px-3 py-1.5 rounded-full shadow-inner relative">
                <span className="text-base font-bold px-1">{day === 0 ? '選警長' : `第 ${day} 天`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-wolf-success bg-wolf-success/10 px-2.5 py-1.5 rounded-full shadow-inner">
                <Users className="w-4 h-4" />
                <span className="text-base font-bold">{alivePlayers.length}</span>
                <span>存活</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main {...swipeHandlers} className="flex-1 overflow-y-auto w-full max-w-lg mx-auto p-1.5 flex flex-col">
        <div className="flex flex-col gap-1.5">
          {orderedPlayers.map((playerId) => {
            const isAlive = alivePlayers.includes(playerId);
            const note = currentDayNotes[playerId];
            if (!note) return null;

            const safeActions = {
              attackLight: note.actions.attackLight || [],
              attackHeavy: note.actions.attackHeavy || [],
              protectLight: note.actions.protectLight || [],
              protectHeavy: note.actions.protectHeavy || [],
              attackedLightBy: note.actions.attackedLightBy || [],
              attackedHeavyBy: note.actions.attackedHeavyBy || [],
              protectedLightBy: note.actions.protectedLightBy || [],
              protectedHeavyBy: note.actions.protectedHeavyBy || [],
            };
            const { attackedLightBy, attackedHeavyBy, protectedLightBy, protectedHeavyBy } = safeActions;
            
            let pressTimer: ReturnType<typeof setTimeout>;
            const handleLongPress = () => removeSpeaker(day, playerId);

            return (
              <div
                key={playerId}
                className={clsx(
                  'bg-wolf-panel rounded-xl p-2 shadow-sm border transition-all duration-300',
                  isAlive ? 'border-gray-700/50' : 'opacity-50 grayscale-[50%] border-gray-800',
                  (focusedSpeechPlayerId === playerId || focusedTagPlayerId === playerId) && 'ring-2 ring-wolf-primary border-transparent'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap relative">
                  <div
                    onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
                    onTouchStart={() => { pressTimer = setTimeout(handleLongPress, 600); }}
                    onTouchEnd={() => clearTimeout(pressTimer)}
                    onTouchMove={() => clearTimeout(pressTimer)}
                    onMouseDown={() => { pressTimer = setTimeout(handleLongPress, 600); }}
                    onMouseUp={() => clearTimeout(pressTimer)}
                    onMouseLeave={() => clearTimeout(pressTimer)}
                    onClick={() => {
                      if (gameMode === 'manual') togglePlayerAlive(playerId);
                    }}
                    className={clsx(
                      'flex items-center justify-center w-7 h-7 shrink-0 rounded-full text-sm font-bold shadow-sm transition-transform select-none',
                      gameMode === 'manual' ? 'cursor-pointer hover:scale-105 ring-2 ring-gray-600' : '',
                      isAlive ? 'bg-wolf-primary text-white' : 'bg-gray-600 text-gray-300'
                    )}
                  >
                    {playerId}
                  </div>
                  
                  {!isAlive && (
                    <span className="shrink-0 text-[10px] font-bold text-wolf-danger bg-wolf-danger/20 px-1.5 py-0.5 rounded">
                      已出局
                    </span>
                  )}

                  {currentOrder.includes(playerId) && (
                    <span className="shrink-0 text-[10px] font-bold text-gray-300 bg-gray-700 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => removeSpeaker(day, playerId)}>
                      已發言(長按取消)
                    </span>
                  )}

                  {(attackedLightBy.length > 0 || attackedHeavyBy.length > 0 || protectedLightBy.length > 0 || protectedHeavyBy.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium bg-gray-900/60 px-1.5 py-0.5 rounded-md border border-gray-800">
                      {(attackedLightBy.length > 0 || attackedHeavyBy.length > 0) && (
                        <div className="text-wolf-danger flex items-center gap-0.5">
                          <Sword className="w-3 h-3" /> 
                          <span className="flex items-center gap-0.5">
                            {attackedLightBy.length > 0 && <span className="text-white bg-wolf-danger/30 px-1 rounded">被 {attackedLightBy.join(',')} 輕踩</span>}
                            {attackedHeavyBy.length > 0 && <span className="text-white bg-red-600 px-1 rounded font-bold">被 {attackedHeavyBy.join(',')} 重打</span>}
                          </span>
                        </div>
                      )}
                      {(attackedLightBy.length > 0 || attackedHeavyBy.length > 0) && (protectedLightBy.length > 0 || protectedHeavyBy.length > 0) && (
                        <span className="text-gray-600">|</span>
                      )}
                      {(protectedLightBy.length > 0 || protectedHeavyBy.length > 0) && (
                        <div className="text-wolf-success flex items-center gap-0.5">
                          <Shield className="w-3 h-3" /> 
                          <span className="flex items-center gap-0.5">
                            {protectedLightBy.length > 0 && <span className="text-white bg-wolf-success/30 px-1 rounded">被 {protectedLightBy.join(',')} 微保</span>}
                            {protectedHeavyBy.length > 0 && <span className="text-white bg-green-600 px-1 rounded font-bold">被 {protectedHeavyBy.join(',')} 鐵保</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* Top Box: Tags */}
                  <div
                    className={clsx(
                      "w-full min-h-[36px] bg-gray-900/60 border rounded-md py-1.5 px-2 text-sm text-gray-100 flex items-center flex-wrap gap-1 transition-all cursor-pointer",
                      focusedTagPlayerId === playerId ? "border-wolf-primary ring-1 ring-wolf-primary" : "border-gray-700 hover:border-gray-500"
                    )}
                    onClick={() => {
                      setFocusedTagPlayerId(playerId);
                      setFocusedSpeechPlayerId(null);
                      addSpeaker(day, playerId);
                    }}
                  >
                    {note.tagText ? (
                      <span className="text-wolf-primary font-bold">{note.tagText}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">快捷標籤... (點擊喚起自訂鍵盤)</span>
                    )}
                  </div>
                  
                  {/* Bottom Box: Speech */}
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 absolute top-2 left-2 text-gray-500" />
                    <TextareaAutosize
                      className="w-full bg-gray-900/40 border border-gray-700 rounded-md py-1.5 pl-8 pr-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-wolf-primary focus:ring-1 focus:ring-wolf-primary resize-none transition-all"
                      minRows={1}
                      placeholder="詳細發言紀錄... (點擊喚起系統鍵盤)"
                      value={note.speechText}
                      onChange={(e) => setSpeechText(playerId, e.target.value)}
                      onFocus={() => {
                        setFocusedSpeechPlayerId(playerId);
                        setFocusedTagPlayerId(null);
                        addSpeaker(day, playerId);
                      }}
                      onBlur={() => setFocusedSpeechPlayerId(null)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Custom Keyboard for Tags */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 w-full bg-wolf-dark/95 backdrop-blur-xl border-t border-gray-700/80 p-2 transition-all duration-300 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]',
          !focusedTagPlayerId && 'translate-y-[100%] opacity-0 pointer-events-none'
        )}
      >
        <div className="max-w-lg mx-auto flex gap-2">
          {/* Left: Tags */}
          <div className="flex-1 grid grid-cols-4 gap-1.5">
            {customKeyboardTags.map(tag => (
              <button
                key={tag}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => appendTag(tag)}
                className="bg-gray-800 text-gray-200 border border-gray-700 rounded-md text-xs sm:text-sm py-2.5 font-medium hover:bg-gray-700 active:scale-95 transition-transform"
              >
                {tag}
              </button>
            ))}
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => appendTag(' ')}
              className="bg-gray-800 text-gray-200 border border-gray-700 rounded-md text-xs sm:text-sm py-2.5 font-medium hover:bg-gray-700 active:scale-95 transition-transform col-span-2"
            >
              [ 空格 ]
            </button>
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={backspaceTag}
              className="bg-wolf-danger/20 text-wolf-danger border border-wolf-danger/30 rounded-md text-sm py-2.5 font-bold hover:bg-wolf-danger/30 active:scale-95 transition-transform col-span-2 flex items-center justify-center gap-1"
            >
              <Delete className="w-4 h-4" /> 刪除
            </button>
          </div>
          
          {/* Right: Numbers */}
          <div className="w-[110px] shrink-0 grid grid-cols-3 gap-1.5">
            {numbers.map(num => (
              <button
                key={num}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => appendTag(num.toString())}
                className="bg-wolf-primary/90 text-white font-bold rounded-md py-2.5 hover:bg-wolf-primary active:scale-95 transition-transform shadow-md"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Click-away overlay to close custom keyboard */}
      {focusedTagPlayerId && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setFocusedTagPlayerId(null)}
        />
      )}
    </div>
  );
};
