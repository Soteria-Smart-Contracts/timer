document.addEventListener('DOMContentLoaded', () => {
    const plots = document.querySelectorAll('.plot');
    let timers = {};
    let treeStates = {};
    let totalBlinkersToday = 0;
    let highScore = 0;
    let isBlinking = false; // Flag to ensure only one blinker at a time

    // Load saved states from storage
    chrome.storage.local.get(['treeStates', 'totalBlinkersToday', 'highScore'], (result) => {
        if (result.treeStates) {
            treeStates = result.treeStates;
        }
        if (result.totalBlinkersToday !== undefined) {
            totalBlinkersToday = result.totalBlinkersToday;
        }
        if (result.highScore !== undefined) {
            highScore = result.highScore;
        }
        updatePlots();
        updateBlinkStats();
        resetDailyCountAtMidnight();
    });

    function updatePlots() {
        plots.forEach((plot, index) => {
            const state = treeStates[index];
            if (state && state.planted && !state.dead) {
                plot.classList.add('active');
                const timerElement = plot.querySelector('.timer');
                if (!timerElement) {
                    const newTimer = document.createElement('div');
                    newTimer.className = 'timer';
                    plot.appendChild(newTimer);
                }
                plot.querySelector('.timer').textContent = 'Planted!';
                plot.querySelector('.timer').style.fontSize = '16px'; // Set consistent font size
                plot.querySelector('.timer').classList.remove('countdown'); // Remove countdown class
            } else {
                plot.classList.remove('active');
                const timerElement = plot.querySelector('.timer');
                if (timerElement) {
                    plot.removeChild(timerElement);
                }
            }
        });
    }

    function updateBlinkStats() {
        document.getElementById('blink-count').textContent = totalBlinkersToday;
        document.getElementById('high-score').textContent = highScore;
    }

    plots.forEach((plot, index) => {
        plot.addEventListener('click', () => {
            if (!isBlinking && (!treeStates[index] || treeStates[index].dead)) {
                isBlinking = true;
                startCountdown(plot, index);
            }
        });
    });

    function startCountdown(plot, index) {
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownText = document.getElementById('countdown-text');
        let countdownValues = ['Ready', 'Set', 'Go'];
        let countdownIndex = 0;

        countdownOverlay.style.display = 'flex';
        countdownText.textContent = '';

        const countdownInterval = setInterval(() => {
            if (countdownIndex < countdownValues.length) {
                countdownText.textContent = countdownValues[countdownIndex];
                countdownIndex++;
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                startTimer(plot, index);
            }
        }, 1000);
    }

    function startTimer(plot, index) {
        let startTime = Date.now();
        let interval = setInterval(() => {
            let elapsed = (Date.now() - startTime) / 1000;
            let timerElement = plot.querySelector('.timer');
            if (!timerElement) {
                const newTimer = document.createElement('div');
                newTimer.className = 'timer countdown'; // Add countdown class
                plot.appendChild(newTimer);
            }
            let remainingTime = 8 - Math.floor(elapsed);

            if (remainingTime <= 2) {
                // Blink red and white in the last 2 seconds
                timerElement.style.color = (Math.floor(elapsed) % 2 === 0) ? 'red' : 'white';
            } else {
                timerElement.style.color = 'white';
            }

            timerElement.style.fontSize = `${24 + (elapsed * 4)}px`; // Growing font size during timer
            timerElement.textContent = `${remainingTime}s`;

            if (elapsed >= 8) {
                clearInterval(interval);
                plot.classList.add('active');
                treeStates[index] = { planted: true, dead: false };
                totalBlinkersToday++;
                if (totalBlinkersToday > highScore) {
                    highScore = totalBlinkersToday;
                }
                chrome.storage.local.set({ treeStates: treeStates, totalBlinkersToday: totalBlinkersToday, highScore: highScore }, () => {
                    console.log('Tree planted!');
                });
                timerElement.textContent = 'Planted!';
                timerElement.style.fontSize = '16px'; // Set consistent font size
                timerElement.classList.remove('countdown'); // Remove countdown class
                startBlinkerAnimation(plot);
            }
        }, 100);
    }

    function startBlinkerAnimation(plot) {
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownText = document.getElementById('countdown-text');
        countdownOverlay.style.display = 'flex';
        countdownText.textContent = 'BLINKER';

        let flashCount = 0;
        const flashInterval = setInterval(() => {
            if (flashCount < 10) { // Flash 10 times
                if (flashCount % 2 === 0) {
                    countdownOverlay.style.backgroundColor = 'black';
                    countdownText.style.color = 'white';
                } else {
                    countdownOverlay.style.backgroundColor = 'white';
                    countdownText.style.color = 'black';
                }
                flashCount++;
            } else {
                clearInterval(flashInterval);
                countdownOverlay.style.display = 'none';
                isBlinking = false; // Allow another blink
                updateBlinkStats();
                setTimeout(() => {
                    treeStates[index].dead = true;
                    chrome.storage.local.set({ treeStates: treeStates }, () => {
                        console.log('Tree died!');
                    });
                    plot.classList.remove('active');
                    const timerElement = plot.querySelector('.timer');
                    if (timerElement) {
                        plot.removeChild(timerElement);
                    }
                }, 7200000); // 2 hours
            }
        }, 200); // Flash every 200ms
    }

    const resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', () => {
        treeStates = {};
        chrome.storage.local.set({ treeStates: treeStates }, () => {
            console.log('Trees reset!');
        });
        updatePlots();
    });

    function resetDailyCountAtMidnight() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const timeUntilMidnight = tomorrow - now;

        setTimeout(() => {
            totalBlinkersToday = 0;
            chrome.storage.local.set({ totalBlinkersToday: totalBlinkersToday }, () => {
                console.log('Daily blink count reset at midnight!');
            });
            updateBlinkStats();
            resetDailyCountAtMidnight(); // Schedule the next reset
        }, timeUntilMidnight);
    }
});