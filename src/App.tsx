import { useState, useRef, useEffect } from "react";
import "./App.css";
import revUpSound from "./assets/rev-up.mp3";
import revDownSound from "./assets/rev-down.mp3";
import idleSound from "./assets/idle.mp3";
import revHoldSound from "./assets/continuousrev.mp3"; 
import revbutton from "./assets/revbutton.png";
// You'll need to add an explosion sound to your assets
import explosionSound from "./assets/explosion.mp3";

function App() {
  const [isHeld, setIsHeld] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [temperature, setTemperature] = useState(0);
  const [isExploded, setIsExploded] = useState(false);
  const tempIncreaseInterval = useRef<number | null>(null);
  
  const [audioElements] = useState(() => {
    return {
      revUp: new Audio(revUpSound),
      revHold: new Audio(revHoldSound),
      revDown: new Audio(revDownSound),
      idle: new Audio(idleSound),
      explosion: new Audio(explosionSound)
    };
  });

  // Temperature management
  useEffect(() => {
    if (isHeld && !isExploded) {
      // Increase temperature while revving
      tempIncreaseInterval.current = window.setInterval(() => {
        setTemperature(prevTemp => {
          const newTemp = prevTemp + 1;
          // Check for overheating
          if (newTemp >= 100) {
            explodeEngine();
            return 100;
          }
          return newTemp;
        });
      }, 200); // Adjust the interval to control how fast temperature rises
    } else if (!isHeld && !isExploded) {
      // Cool down when not revving
      tempIncreaseInterval.current = window.setInterval(() => {
        setTemperature(prevTemp => Math.max(0, prevTemp - 0.5));
      }, 100); // Faster cooldown
    }

    return () => {
      if (tempIncreaseInterval.current !== null) {
        clearInterval(tempIncreaseInterval.current);
      }
    };
  }, [isHeld, isExploded]);

  // Handle audio initialization
  useEffect(() => {
    // Setup idle sound
    const idle = audioElements.idle;
    idle.loop = true;
    idle.volume = 0.8;
    
    // Try to play idle sound (may not work until user interaction)
    const playIdle = () => {
      idle.play().catch(err => {
        console.log("Waiting for user interaction to play audio");
      });
    };
    
    playIdle();
    
    // Clean up function
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [audioElements]);

  const explodeEngine = () => {
    setIsExploded(true);
    setIsHeld(false);
    
    // Stop all other sounds
    const { revUp, revHold, revDown, idle, explosion } = audioElements;
    
    revUp.pause();
    revHold.pause();
    revDown.pause();
    idle.pause();
    
    // Play explosion sound
    explosion.currentTime = 0;
    explosion.play().catch(err => {
      console.error("Error playing explosion sound:", err);
    });
    
    // Clear any intervals
    if (tempIncreaseInterval.current !== null) {
      clearInterval(tempIncreaseInterval.current);
    }
  };

  const resetEngine = () => {
    setIsExploded(false);
    setTemperature(0);
    setIsIdle(true);
    
    // Restart idle sound
    const { idle } = audioElements;
    idle.currentTime = 0;
    idle.play().catch(err => {
      console.error("Error playing idle sound:", err);
    });
  };

  const startRevving = () => {
    if (isExploded) return;
    
    setIsHeld(true);
    setIsIdle(false);
    
    const { idle, revUp, revHold } = audioElements;
    
    // Stop idle sound
    idle.pause();
    idle.currentTime = 0;
    
    // Play rev-up sound
    revUp.currentTime = 0;
    
    const playRevUp = () => {
      revUp.play().catch(err => {
        console.error("Error playing rev-up sound:", err);
      });
    };
    
    playRevUp();
    
    // Clear any previous onended handlers
    revUp.onended = null;
    
    // Set up handler for when rev-up ends
    revUp.onended = () => {
      if (isHeld && !isExploded) {
        revHold.currentTime = 0;
        revHold.loop = true;
        
        const playRevHold = () => {
          console.log("Starting continuous rev sound");
          revHold.play();
        };
        
        playRevHold();
      }
    };
  };

  const stopRevving = () => {
    if (isExploded) return;
    
    setIsHeld(false);
    
    const { revUp, revHold, revDown, idle } = audioElements;
    
    revUp.onended = null;
    
    // Stop rev-up if it's still playing
    revUp.pause();
    revUp.currentTime = 0;
    
    // Stop continuous rev
    revHold.pause();
    revHold.currentTime = 0;
    
    // Play rev-down sound
    revDown.currentTime = 0;
    
    const playRevDown = () => {
      revDown.play();
    };
    
    playRevDown();
    
    // Set up handler for when rev-down ends
    revDown.onended = () => {
      setIsIdle(true);
      idle.currentTime = 0;
      
      const playIdle = () => {
        idle.play().catch(err => {
          console.error("Error playing idle sound:", err);
        });
      };
      
      playIdle();
    };
  };

  const eventHandlers = {
    onTouchStart: (e : any) => {
      e.preventDefault(); 
      startRevving();
    },
    onTouchEnd: (e : any) => {
      e.preventDefault();
      stopRevving();
    },
    onTouchCancel: (e : any) => {
      e.preventDefault();
      stopRevving();
    },
    
    // Mouse events for desktop
    onMouseDown: startRevving,
    onMouseUp: stopRevving,
    onMouseLeave: stopRevving,
    
    // For pointer events (works on most modern browsers)
    onPointerDown: startRevving,
    onPointerUp: stopRevving,
    onPointerLeave: stopRevving
  };

  // Get color for temperature gauge
  const getTempColor = () => {
    if (temperature < 30) return "#22cc22"; // Green
    if (temperature < 60) return "#cccc22"; // Yellow
    if (temperature < 85) return "#cc7722"; // Orange
    return "#cc2222"; // Red
  };

  return (
    <div className="card">
      <button 
        {...(isExploded ? {} : eventHandlers)}
        className={isHeld ? "revving" : (isExploded ? "exploded" : "")}
        style={{backgroundColor:'transparent'}}
      >
        <img src={revbutton} alt="Rev button" />
      </button>
      
      <div className="status">
        <p style={{fontSize:'2rem', margin:0}}>
          Status: {isExploded ? "BLOWN ENGINE!" : (isHeld ? "Revving" : (isIdle ? "Idle" : "Cooling Down"))}
        </p>
        
        {/* Temperature gauge */}
        <div style={{marginTop: '1rem', width: '100%'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <span>Temp:</span>
            <div style={{
              width: '100%', 
              height: '20px', 
              backgroundColor: '#ddd', 
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${temperature}%`,
                height: '100%',
                backgroundColor: getTempColor(),
                transition: 'width 0.2s, background-color 0.5s'
              }}></div>
            </div>
            <span>{Math.round(temperature)}°C</span>
          </div>
        </div>
        
        {isExploded && (
          <button 
            onClick={resetEngine}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1.25rem',
              backgroundColor: '#2233cc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Replace Engine
          </button>
        )}
      </div>
    </div>
  );
}

export default App;