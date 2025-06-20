document.addEventListener('DOMContentLoaded', () => {
    const plots = document.querySelectorAll('.plot');
    let treeStates = {};
    let totalBlinkersToday = 0;
    let highScore = 0;
    let isBlinking = false;

    // Load saved states from storage
    chrome.storage.local.get(['treeStates', 'totalBlinkersToday', 'highScore'], ({ treeStates: ts, totalBlinkersToday: tb, highScore: hs }) => {
        treeStates = ts || {};
        totalBlinkersToday = tb || 0;
        highScore = hs || 0;
        updatePlots();
        updateBlinkStats();
        resetDailyCountAtMidnight();
    });

    // Update the plots to reflect the current state of trees
    function updatePlots() {
        plots.forEach((plot, index) => {
            const state = treeStates[index];
            if (state && state.planted && !state.dead) {
                plot.classList.add('active');
                plot.innerHTML = '<div class="timer">Planted!</div>';
            } else {
                plot.classList.remove('active');
                plot.innerHTML = '';
            }
        });
    }

    // Update the blink stats display
    function updateBlinkStats() {
        document.getElementById('blink-count').textContent = totalBlinkersToday;
        document.getElementById('high-score').textContent = highScore;
    }

    // Start the countdown overlay
    async function startCountdown(plot, index) {
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        text.style.color = 'white';
        let values = ['Ready', 'Set', 'Go'];
        let i = 0;

        overlay.style.display = 'flex';
        text.textContent = '';

        const interval = setInterval(() => {
            if (i < values.length) {
                text.textContent = values[i++];
            } else {
                clearInterval(interval);
                overlay.style.display = 'none';
                startTimer(plot, index);
            }
        }, 1000);
    }

    // Start the timer for planting a tree
    function startTimer(plot, index) {
        let startTime = Date.now();
        let interval = setInterval(() => {
            let elapsed = (Date.now() - startTime) / 1000;
            let timerElement = plot.querySelector('.timer');
            if (!timerElement) {
                timerElement = document.createElement('div');
                timerElement.className = 'timer countdown';
                plot.appendChild(timerElement);
            }
            let remainingTime = 8 - Math.floor(elapsed);

            if (remainingTime <= 2) {
                timerElement.style.color = (Math.floor(elapsed) % 2 === 0) ? 'red' : 'white';
            } else {
                timerElement.style.color = 'white';
            }

            timerElement.style.fontSize = `${24 + (elapsed * 4)}px`;
            timerElement.textContent = `${remainingTime}s`;

            if (elapsed >= 8) {
                clearInterval(interval);
                plot.classList.add('active');
                treeStates[index] = { planted: true, dead: false };
                totalBlinkersToday++;
                if (totalBlinkersToday > highScore) {
                    highScore = totalBlinkersToday;
                }
                chrome.storage.local.set({ treeStates, totalBlinkersToday, highScore }, () => {
                    console.log('Tree planted!');
                });
                timerElement.textContent = 'Planted!';
                timerElement.style.fontSize = '16px';
                startBlinkerAnimation(plot);
            }
        }, 100);
    }

    // Start the blinker animation
    function startBlinkerAnimation(plot) {
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.style.display = 'flex';
        text.textContent = 'BLINKER';

        let i = 0;
        const interval = setInterval(() => {
            if (i < 10) {
                overlay.style.backgroundColor = (i % 2 === 0) ? 'black' : 'white';
                text.style.color = (i % 2 === 0) ? 'white' : 'black';
                i++;
            } else {
                clearInterval(interval);
                overlay.style.display = 'none';
                isBlinking = false;
                updateBlinkStats();
                checkAllTreesFilled();
                setTimeout(() => {
                    treeStates[index].dead = true;
                    chrome.storage.local.set({ treeStates }, () => {
                        console.log('Tree died!');
                    });
                    plot.classList.remove('active');
                    plot.innerHTML = '';
                }, 7200000);
            }
        }, 200);
    }

    // Check if all trees are filled and display gnome image
    function checkAllTreesFilled() {
        const allPlanted = Object.values(treeStates).every(state => state.planted && !state.dead);
        if (allPlanted) {
            displayGnome();
        }
    }

    // Display gnome image with a unique message
    function displayGnome() {
        const overlay = document.getElementById('countdown-overlay');
        const text = document.getElementById('countdown-text');
        overlay.style.display = 'flex';
        text.style.color = 'white';
        text.style.textAlign = 'center';
        text.style.marginTop = '20px';
        text.style.fontSize = '24px';

        const img = document.createElement('img');
        img.src = 'gnome.jpg';
        img.style.width = '100px';
        img.style.height = 'auto';
        img.style.margin = '0 auto 10px';

        const message = document.createElement('div');
        message.textContent = getRandomGnomeMessage();
        message.style.color = 'white';
        message.style.textAlign = 'center';
        message.style.fontSize = '18px';

        overlay.innerHTML = '';
        overlay.appendChild(img);
        overlay.appendChild(message);

        setTimeout(() => {
            overlay.style.display = 'none';
        }, 5000); // Display for 5 seconds
    }

    // Get a random gnome message
    function getRandomGnomeMessage() {
        const messages = [
           "Keep it up, Blinker Buddy! 🌟",
              "You're a true Blinker Champion! 🏆",
              "Blinking brilliance! Keep it going! 💫",
              "You're a Blinker Legend! 🌈",
                "Blinking your way to greatness! 🚀",
                "Blinker power! You're unstoppable! 💪",
                "Blinking for a brighter tomorrow! 🌞",
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Reset daily blink count at midnight
    function resetDailyCountAtMidnight() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const timeUntilMidnight = tomorrow - now;

        setTimeout(() => {
            totalBlinkersToday = 0;
            highScore = 0; // Reset high score if today's count was the highest
            chrome.storage.local.set({ treeStates, totalBlinkersToday, highScore }, () => {
                console.log('Daily blink count reset at midnight!');
            });
            updateBlinkStats();
            resetDailyCountAtMidnight();
        }, timeUntilMidnight);
    }

    // Event listeners for plots
    plots.forEach((plot, index) => {
        plot.addEventListener('click', () => {
            if (!isBlinking && (!treeStates[index] || treeStates[index].dead)) {
                isBlinking = true;
                startCountdown(plot, index);
            }
        });
    });

    // Event listener for reset button
    document.getElementById('reset-button').addEventListener('click', () => {
        treeStates = {};
        chrome.storage.local.set({ treeStates }, () => {
            console.log('Trees reset!');
        });
        updatePlots();
    });

    // Event listener for reducing daily blinker count
    document.getElementById('blink-count').addEventListener('click', () => {
        if (totalBlinkersToday > 0) {
            totalBlinkersToday--;
            if (totalBlinkersToday < highScore) {
                highScore = totalBlinkersToday;
            }
            chrome.storage.local.set({ totalBlinkersToday, highScore }, () => {
                console.log('Daily blink count reduced!');
            });
            updateBlinkStats();
        }
    });
});