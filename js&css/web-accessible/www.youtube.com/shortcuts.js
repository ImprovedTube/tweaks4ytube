/*------------------------------------------------------------------------------
4.7.0 SHORTCUTS

WARNING: Browser Debugger Breakpoint downstream from keydown() event will eat corresponding keyup()
 thus breaking our tracking of ImprovedTube.input.pressed.keys (stuck key) until said Breakpoint
 is disabled and key pressed again OR switching tabs/windows to trigger 'improvedtube-blur'.
 Make sure to have that in mind when debugging.
------------------------------------------------------------------------------*/
ImprovedTube.shortcuts = function () {
	const ignoreElements = ['EMBED', 'INPUT', 'OBJECT', 'TEXTAREA', 'IFRAME'],
		modifierKeys = ['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight'],
		handlers = {
			keydown: function (event) {
				if (document.activeElement && ignoreElements.includes(document.activeElement.tagName) || event.target.isContentEditable) return;

				ImprovedTube.input.pressed.wheel = 0;
				ImprovedTube.input.pressed.alt = event.altKey;
				ImprovedTube.input.pressed.ctrl = event.ctrlKey;
				ImprovedTube.input.pressed.shift = event.shiftKey;
				if (!modifierKeys.includes(event.code) && !ImprovedTube.input.pressed.keys.includes(event.keyCode)) {
					ImprovedTube.input.pressed.keys.push(event.keyCode);
				}

				handler();
			},
			keyup: function (event) {
				ImprovedTube.input.pressed.wheel = 0;
				ImprovedTube.input.pressed.alt = event.altKey;
				ImprovedTube.input.pressed.ctrl = event.ctrlKey;
				ImprovedTube.input.pressed.shift = event.shiftKey;
				if (ImprovedTube.input.pressed.keys.includes(event.keyCode)) {
					ImprovedTube.input.pressed.keys.splice(ImprovedTube.input.pressed.keys.indexOf(event.keyCode), 1);
				}
				// cancel keyup events corresponding to keys that triggered one of our shortcuts
				if (ImprovedTube.input.cancelled.includes(event.keyCode)) {
					event.preventDefault();
					event.stopPropagation();
					ImprovedTube.input.cancelled.splice(ImprovedTube.input.cancelled.indexOf(event.keyCode), 1);
				}
			},
			wheel: function (event) {
				if (document.activeElement && ignoreElements.includes(document.activeElement.tagName) || event.target.isContentEditable) return;

				ImprovedTube.input.pressed.wheel = event.deltaY > 0 ? 1 : -1;
				ImprovedTube.input.pressed.alt = event.altKey;
				ImprovedTube.input.pressed.ctrl = event.ctrlKey;
				ImprovedTube.input.pressed.shift = event.shiftKey;

				handler();
			},
			'improvedtube-player-loaded': function () {
				//Please Fix: November2023: this parentNode doesnt exist on youtube.com/shorts
				if (ImprovedTube.elements.player && ImprovedTube.elements.player.parentNode) {
					ImprovedTube.elements.player?.parentNode?.addEventListener('mouseover', function () {
						ImprovedTube.input.pressed.player = true;
						ImprovedTube.input.pressed.wheel = 0;
					}, true);

					ImprovedTube.elements.player?.parentNode?.addEventListener('mouseout', function () {
						ImprovedTube.input.pressed.player = false;
						ImprovedTube.input.pressed.wheel = 0;
					}, true);
				}
			},
			'improvedtube-blur': function () {
				ImprovedTube.input.pressed.keys = [];
				ImprovedTube.input.pressed.alt = false;
				ImprovedTube.input.pressed.ctrl = false;
				ImprovedTube.input.pressed.shift = false;
				ImprovedTube.input.pressed.player = false;
				ImprovedTube.input.pressed.wheel = 0;
			}
		};

	function handler () {
		for (const [key, shortcut] of Object.entries(ImprovedTube.input.listening)) {
			if ((ImprovedTube.input.pressed.keys
					&& ImprovedTube.input.pressed.keys.length === shortcut.keys.length
					&& ImprovedTube.input.pressed.keys.every((k, i) => k === shortcut.keys[i]))
				&& ImprovedTube.input.pressed.alt === shortcut.alt
				&& ImprovedTube.input.pressed.ctrl === shortcut.ctrl
				&& ImprovedTube.input.pressed.shift === shortcut.shift
				&& (ImprovedTube.input.pressed.wheel === shortcut.wheel
					// shortcuts with wheel allowed ONLY inside player
					&& (!ImprovedTube.input.pressed.wheel || ImprovedTube.input.pressed.player))) {

				if (key.startsWith('shortcutQuality')) {
					ImprovedTube['shortcutQuality'](key);
				} else if (typeof ImprovedTube[key] === 'function') {
					ImprovedTube[key]();
				}
				// cancel keydown/wheel event
				event.preventDefault();
				event.stopPropagation();
				// build 'cancelled' list so we also cancel keyup events
				ImprovedTube.input.pressed.keys.every((k, i) => ImprovedTube.input.cancelled.push(k));
			}
		}
	};

	// reset 'listening'
	this.input.listening = {};
	// extract shortcuts from User Settings and initialize 'listening'
	for (const [name, keys] of Object.entries(this.storage).filter(v => v[0].startsWith('shortcut_'))) {
		if (!keys) continue;
		// camelCase(name)
		const camelName = name.replace(/_(.)/g, (m, l) => l.toUpperCase());
		let potentialShortcut = {};
		for (const button of ['alt', 'ctrl', 'shift', 'wheel', 'keys']) {
			switch (button) {
				case 'alt':
				case 'ctrl':
				case 'shift':
				case 'toggle':
					potentialShortcut[button] = keys[button] || false;
					break

				case 'wheel':
					potentialShortcut[button] = keys[button] || 0;
					break

				case 'keys':
					// array of sorted scancodes
					potentialShortcut[button] = keys[button] ? Object.keys(keys[button]).map(s=>Number(s)).sort() : [];
					break
			}
		}
		if (potentialShortcut['keys'] || potentialShortcut['wheel']) this.input.listening[camelName] = potentialShortcut;
	}
	// initialize Listeners, but only once!
	for (const [name, handler] of Object.entries(handlers)) {
		if (!this.input.listeners[name]) {
			this.input.listeners[name] = true;
			window.addEventListener(name, handler, {passive: false, capture: true});
		}
	}
};
/*------------------------------------------------------------------------------
Ambient lighting
------------------------------------------------------------------------------*/
ImprovedTube.shortcutToggleAmbientLighting = function () {
	document.documentElement.toggleAttribute('it-ambient-lighting');
};
/*------------------------------------------------------------------------------
4.7.1 QUALITY
------------------------------------------------------------------------------*/
ImprovedTube.shortcutQuality = function (key) {
	const label = ['auto', 'tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'hd2880', 'highres'],
		resolution = ['auto', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', '2880p', '4320p'];

	ImprovedTube.playerQuality(label[resolution.indexOf(key.replace('shortcutQuality', ''))]);
};
/*------------------------------------------------------------------------------
4.7.2 PICTURE IN PICTURE (PIP)
------------------------------------------------------------------------------*/
ImprovedTube.shortcutPictureInPicture = this.enterPip;
/*------------------------------------------------------------------------------
4.7.3 TOGGLE CONTROLS
------------------------------------------------------------------------------*/
ImprovedTube.shortcutToggleControls = function () {
	const player = this.elements.player;
	let option = this.storage.player_hide_controls;

	if (player && player.hideControls && player.showControls) {
		if (option === 'when_paused') {
			if (this.elements.video.paused) {
				option = 'off';
			} else {
				option = 'always';
			}
		} else if (option === 'always') {
			option = 'off';
		} else {
			option = 'always';
		}

		this.storage.player_hide_controls = option;
		ImprovedTube.playerControls()
	}
};
/*------------------------------------------------------------------------------
4.7.4 PLAY / PAUSE
------------------------------------------------------------------------------*/
ImprovedTube.shortcutPlayPause = function () {
	const video = this.elements.video;
	if (video) {
		if (video.paused) {
			video.play();
		} else {
			video.pause();
		}
	}
};
/*------------------------------------------------------------------------------
4.7.5 STOP
------------------------------------------------------------------------------*/
ImprovedTube.shortcutStop = function () {
	this.elements.player?.stopVideo();
};
/*------------------------------------------------------------------------------
4.7.6 TOGGLE AUTOPLAY
------------------------------------------------------------------------------*/
ImprovedTube.shortcutToggleAutoplay = function () {
	this.storage.player_autoplay_disable = !this.storage.player_autoplay_disable;
};
/*------------------------------------------------------------------------------
4.7.7 NEXT VIDEO
------------------------------------------------------------------------------*/
ImprovedTube.shortcutNextVideo = function () {
	if (this.elements.player) {
		var playlist_loop_button = document.querySelector('[aria-label="Loop playlist"]');

		if (playlist_loop_button) {
			if (playlist_loop_button.ariaPressed === 'true') {
				this.elements.player.setLoop(true);
			} else {
				this.elements.player.setLoop(false)
			}
		}

		this.elements.player.nextVideo();
	}
};
/*------------------------------------------------------------------------------
4.7.8 PREVIOUS VIDEO
------------------------------------------------------------------------------*/
ImprovedTube.shortcutPrevVideo = function () {
	if (this.elements.player) {
		var playlist_loop_button = document.querySelector('[aria-label="Loop playlist"]');

		if (playlist_loop_button) {
			if (playlist_loop_button.ariaPressed === 'true') {
				this.elements.player.setLoop(true);
			} else {
				this.elements.player.setLoop(false)
			}
		}

		this.elements.player.previousVideo();
	}
};
/*------------------------------------------------------------------------------
4.7.9 SEEK BACKWARD
------------------------------------------------------------------------------*/
ImprovedTube.shortcutSeekBackward = function () {
	this.elements.player?.seekBy(-10);
};
/*------------------------------------------------------------------------------
4.7.10 SEEK FORWARD
------------------------------------------------------------------------------*/
ImprovedTube.shortcutSeekForward = function () {
	this.elements.player?.seekBy(10);
};
/*------------------------------------------------------------------------------
4.7.11 SEEK NEXT CHAPTER
------------------------------------------------------------------------------*/
ImprovedTube.shortcutSeekNextChapter = function () {
	if (this.elements.player) {
		var player = this.elements.player,
			chapters_container = player.querySelector('.ytp-chapters-container'),
			progress_bar = player.querySelector('.ytp-progress-bar');

		if (chapters_container && chapters_container.children && progress_bar) {
			var chapters = chapters_container.children,
				duration = player.getDuration(),
				current_width = player.getCurrentTime() / (duration / 100) * (progress_bar.offsetWidth / 100);

			for (var i = 0, l = chapters.length; i < l; i++) {
				var left = chapters[i].offsetLeft;

				if (current_width < left) {
					player.seekTo(left / (progress_bar.offsetWidth / 100) * (duration / 100));

					return false;
				}
			}
		}
	}
};
/*------------------------------------------------------------------------------
4.7.12 SEEK PREVIOUS CHAPTER
------------------------------------------------------------------------------*/
ImprovedTube.shortcutSeekPreviousChapter = function () {
	if (this.elements.player) {
		var player = this.elements.player,
			chapters_container = player.querySelector('.ytp-chapters-container'),
			progress_bar = player.querySelector('.ytp-progress-bar');

		if (chapters_container && chapters_container.children && progress_bar) {
			var chapters = chapters_container.children,
				duration = player.getDuration(),
				current_width = player.getCurrentTime() / (duration / 100) * (progress_bar.offsetWidth / 100);

			for (var i = chapters.length - 1; i > 0; i--) {
				if (current_width > chapters[i].offsetLeft) {
					var left = 0;

					if (i > 0) {
						left = chapters[i - 1].offsetLeft;
					}

					player.seekTo(left / (progress_bar.offsetWidth / 100) * (duration / 100));

					return false;
				}
			}
		}
	}
};
/*------------------------------------------------------------------------------
4.7.13 INCREASE VOLUME
------------------------------------------------------------------------------*/
ImprovedTube.shortcutIncreaseVolume = function (decrese) {
	const player = this.elements.player,
		value = Number(this.storage.shortcuts_volume_step) || 5,
		direction = decrese ? 'Decrease' : 'Increase';

	if (!player || !player.setVolume || !player.getVolume) {
		console.error('shortcut' + direction + 'Volume: No valid Player element');
		return;
	}

	// universal, goes both ways if you know what I mean
	if (decrese) {
		player.setVolume(player.getVolume() - value);
	} else {
		player.setVolume(player.getVolume() + value);
	}

	localStorage['yt-player-volume'] = JSON.stringify({
		data: JSON.stringify({
			volume: player.getVolume(),
			muted: player.isMuted(),
			expiration: Date.now(),
			creation: Date.now()
		})
	});

	sessionStorage['yt-player-volume'] = localStorage['yt-player-volume'];

	this.showStatus(player.getVolume());
};
/*------------------------------------------------------------------------------
4.7.14 DECREASE VOLUME
------------------------------------------------------------------------------*/
ImprovedTube.shortcutDecreaseVolume = function () {
	ImprovedTube.shortcutIncreaseVolume(true);
};
/*------------------------------------------------------------------------------
4.7.15 SCREENSHOT
------------------------------------------------------------------------------*/
ImprovedTube.shortcutScreenshot = ImprovedTube.screenshot;
/*------------------------------------------------------------------------------
4.7.16 INCREASE PLAYBACK SPEED
------------------------------------------------------------------------------*/
ImprovedTube.shortcutIncreasePlaybackSpeed = function (decrese) {
	const value = Number(this.storage.shortcuts_playback_speed_step) || .05,
		speed = this.playbackSpeed(),
		direction = decrese ? 'Decrease' : 'Increase';
	let newSpeed;

	if (!speed) {
		console.error('shortcut' + direction + 'PlaybackSpeed: Cant establish playbackRate/getPlaybackRate');
		return;
	}

	// universal, goes both ways if you know what I mean
	if (decrese) {
		// 0.1x speed is the minimum
		newSpeed = (speed - value < 0.1) ? 0.1 : (speed - value);
	} else {
		// 10x speed is the limit
		newSpeed = (speed + value > 10) ? 10 : (speed + value);
	}

	newSpeed = this.playbackSpeed(newSpeed);
	if (!newSpeed) {
		console.error('shortcut' + direction + 'PlaybackSpeed: Cant read back playbackRate/getPlaybackRate');
		return;
	}
	ImprovedTube.showStatus(newSpeed);
};
/*------------------------------------------------------------------------------
4.7.17 DECREASE PLAYBACK SPEED
------------------------------------------------------------------------------*/
ImprovedTube.shortcutDecreasePlaybackSpeed = function () {
	ImprovedTube.shortcutIncreasePlaybackSpeed(true);
};
/*------------------------------------------------------------------------------
4.7.18 RESET PLAYBACK SPEED
------------------------------------------------------------------------------*/
ImprovedTube.shortcutResetPlaybackSpeed = function () {
	ImprovedTube.showStatus(this.playbackSpeed(1));
};
/*------------------------------------------------------------------------------
4.7.19 GO TO SEARCH BOX
------------------------------------------------------------------------------*/
ImprovedTube.shortcutGoToSearchBox = function () {
	document.querySelector('input#search')?.focus();
};
/*------------------------------------------------------------------------------
4.7.20 ACTIVATE FULLSCREEN
------------------------------------------------------------------------------*/
ImprovedTube.shortcutActivateFullscreen = function () {
	this.elements.player?.toggleFullscreen();
};
/*------------------------------------------------------------------------------
4.7.21 ACTIVATE CAPTIONS
------------------------------------------------------------------------------*/
ImprovedTube.shortcutActivateCaptions = function () {
	const player = this.elements.player;

	if (player && player.toggleSubtitlesOn) {
		player.toggleSubtitlesOn();
	}
};
/*------Chapters------*/
ImprovedTube.shortcutChapters = function () {
	try {
		var height = document.querySelector('*[target-id*=chapters]').clientHeight;
	} catch {}
	if (height) {
		try {
			document.querySelector('*[target-id*=chapters] #visibility-button button').click(); console.log("chapters shortcut close")
		} catch {}
	} else {
		try {
			document.querySelector('*[target-id*=chapters]').removeAttribute('visibility'); console.log("chapters shortcut open")
		} catch {}
	}
};
/*------Transcript------*/
ImprovedTube.shortcutTranscript = function () {
	try {
		var height = document.querySelector('*[target-id*=transcript]').clientHeight;
	} catch {}
	if (height) {
		try {
			document.querySelector('*[target-id*=transcript] #visibility-button button').click(); console.log("transcriptshortcut close")
		} catch {}
	} else {
		try {
			document.querySelector('*[target-id*=transcript]').removeAttribute('visibility'); console.log("transcriptshortcut open")
		} catch {}
	}
};
/*------------------------------------------------------------------------------
4.7.22 LIKE
------------------------------------------------------------------------------*/
ImprovedTube.shortcutLike = function () {
	document.querySelector('like-button-view-model * * *')?.click();
};
/*------------------------------------------------------------------------------
4.7.23 DISLIKE
------------------------------------------------------------------------------*/
ImprovedTube.shortcutDislike = function () {
	document.querySelector('dislike-button-view-model * * *')?.click();
};
/*------Report------*/
ImprovedTube.shortcutReport = function () {
	try {
		document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 0);
		document.querySelector('svg path[d^="M7.5,12c0,0.83-0.67,1.5-1.5"]').closest("button").click(); document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 0)
	} catch {
		console.log("'...' failed"); setTimeout(function () {
			try {
				document.querySelector('svg path[d^="M7.5,12c0,0.83-0.67,1.5-1.5"]').closest("button").click(); document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 0)
			} catch {
				console.log("'...' failed2")
			}
		}, 100)
	}

	setTimeout(function () {
		try {
			document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 0); document.querySelector('tp-yt-iron-dropdown svg path[d^="M13.18,4l0.24,1.2L13.58,6h0.82H19v7h-5.18l-0"]').closest("tp-yt-paper-item").click();
		} catch {
			console.log("report failed"); setTimeout(function ()	{
				try {
					document.querySelector('tp-yt-iron-dropdown svg path[d^="M13.18,4l0.24,1.2L13.58,6h0.82H19v7h-5.18l-0"]').closest("tp-yt-paper-item").click();
				} catch {
					console.log("report failed2"); document.querySelector('svg path[d^="M7.5,12c0,0.83-0.67,1.5-1.5"]').closest("button").click();
				}
			}, 800);
		}
	}, 200);

	setTimeout(function () {
		try {
			document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 1)
		} catch {
			console.log("dropdown visible failed");
			setTimeout(function () {
				try {
					document.querySelectorAll("tp-yt-iron-dropdown").forEach(el => el.style.opacity = 1)
				} catch {
					console.log("dropdown visible failed2");
				}
			}, 1700)
		}
	}, 700)
}
/*------------------------------------------------------------------------------
4.7.24 SUBSCRIBE
------------------------------------------------------------------------------*/
ImprovedTube.shortcutSubscribe = function () {
	this.elements.subscribe_button?.click();
};
/*------------------------------------------------------------------------------
4.7.25 DARK THEME
------------------------------------------------------------------------------*/
ImprovedTube.shortcutDarkTheme = function () {
	if (document.documentElement.hasAttribute('dark')) {
		// message will propagate all the way to setTheme() so we dont need to do anything more here
		ImprovedTube.messages.send({action: 'set', key: 'theme', value: 'light'});
	} else {
		ImprovedTube.messages.send({action: 'set', key: 'theme', value: 'dark'});
	}
};
/*------------------------------------------------------------------------------
4.7.26 CUSTOM MINI PLAYER
------------------------------------------------------------------------------*/
ImprovedTube.shortcutCustomMiniPlayer = function () {
	this.storage.mini_player = !this.storage.mini_player;

	this.miniPlayer();
};
/*------------------------------------------------------------------------------
Loop
------------------------------------------------------------------------------*/
ImprovedTube.shortcutToggleLoop = function () {
	const video = this.elements.video,
		player = this.elements.player;
	function matchLoopState (opacity) {
		document.querySelector('#it-repeat-button')?.children[0]?.style.setProperty("opacity", opacity);
		document.querySelector('#it-below-player-loop')?.children[0]?.style.setProperty("opacity", opacity);
	};

	if (!(video && player)) return;
	if (video.hasAttribute('loop')) {
		video.removeAttribute('loop');
		matchLoopState('.5');
	} else if (!/ad-showing/.test(player.className)) {
		video.setAttribute('loop', '');
		matchLoopState('1');
	}
};
/*------------------------------------------------------------------------------
4.7.27 STATS FOR NERDS
------------------------------------------------------------------------------*/
ImprovedTube.shortcutStatsForNerds = function () {
	const player = this.elements.player;

	if (!player || !player.isVideoInfoVisible || !player.hideVideoInfo || !player.showVideoInfo) {
		console.error('shortcutStatsForNerds: Need valid Player element');
		return;
	}

	if (player.isVideoInfoVisible()) {
		player.hideVideoInfo();
	} else {
		player.showVideoInfo();
	}
};
/*------------------------------------------------------------------------------
4.7.28 TOGGLE CARDS
------------------------------------------------------------------------------*/
ImprovedTube.shortcutToggleCards = function () {
	function toggleVideoOverlays () {
		document.documentElement.toggleAttribute('it-player-hide-cards');
		document.documentElement.toggleAttribute('it-player-hide-endcards');
		document.documentElement.toggleAttribute('it-hide-video-title-fullScreen');
	}

	toggleVideoOverlays();
	window.removeEventListener('hashchange', toggleVideoOverlays);
	window.addEventListener('hashchange', toggleVideoOverlays);
};
/*------------------------------------------------------------------------------
4.7.29 POPUP PLAYER
------------------------------------------------------------------------------*/
ImprovedTube.shortcutPopupPlayer = function () {
	const player = this.elements.player;

	if (player && document.documentElement.dataset.pageType === 'video') {
		player.pauseVideo();

		window.open('//www.youtube.com/embed/' + location.href.match(/watch\?v=([A-Za-z0-9\-\_]+)/g)[0].slice(8) + '?start=' + parseInt(player.getCurrentTime()) + '&autoplay=' + (ImprovedTube.storage.player_autoplay_disable ? '0' : '1'), '_blank', 'directories=no,toolbar=no,location=no,menubar=no,status=no,titlebar=no,scrollbars=no,resizable=no,width=' + player.offsetWidth + ',height=' + player.offsetHeight);
	}
};
/*------------------------------------------------------------------------------
4.7.30 ROTATE
------------------------------------------------------------------------------*/
ImprovedTube.shortcutRotateVideo = function () {
	const player = this.elements.player,
		video = this.elements.video;
	let rotate = Number(document.body.dataset.itRotate) || 0,
		transform = '';

	if (!player || !video) {
		console.error('shortcutRotateVideo: need player and video elements');
		return;
	}

	rotate += 90;

	if (rotate === 360) {
		rotate = 0;
		video.style.removeProperty("transform");
		delete document.body.dataset.itRotate;
		return;
	}

	document.body.dataset.itRotate = rotate;

	transform += 'rotate(' + rotate + 'deg)';

	if (rotate == 90 || rotate == 270) {
		var is_vertical_video = video.videoHeight > video.videoWidth;

		transform += ' scale(' + (is_vertical_video ? player.clientWidth : player.clientHeight) / (is_vertical_video ? player.clientHeight : player.clientWidth) + ')';
	}
	video.style.setProperty("transform", transform);
};
