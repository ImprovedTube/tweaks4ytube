/*------------------------------------------------------------------------------
4.6.0 CHANNEL
------------------------------------------------------------------------------*/
/*--- DEFAULT CHANNEL TAB ----------------------------------------------------*/
ImprovedTube.channelDefaultTab = function (a) {
	const option = this.storage.channel_default_tab;

	if (option
		&& a
		&& (a.classList.contains('ytd-video-owner-renderer') ||	a.parentNode?.classList.contains('ytd-channel-name'))
		&& !a.href.endsWith(option)
		&& this.regex.channel_home_page.test(a.href)) {

		a.href = a.href.replace(this.regex.channel_home_page_postfix, '') + option;
		a.onclick = function (event) {event.stopPropagation();};

		if (a.parentNode.classList.contains('ytd-channel-name') && document.documentElement.dataset.pageType === 'video') {
			this.elements.yt_channel_name = a.parentNode; // a.textContent ?
			this.elements.yt_channel_link = a;
			this.howLongAgoTheVideoWasUploaded();
			this.channelVideosCount();
		}
	}
};
/*--- PLAY ALL BUTTON --------------------------------------------------------*/
ImprovedTube.channelPlayAllButton = function () {
	if (ImprovedTube.regex.channel.test(location.pathname)) {
		if (this.storage.channel_play_all_button) {
			const container = document.querySelector('ytd-channel-sub-menu-renderer #primary-items')
					|| document.querySelector('ytd-two-column-browse-results-renderer #chips-content'),
				playlistUrl = document.querySelector('ytd-app')?.__data?.data?.response?.metadata?.channelMetadataRenderer?.externalId?.substring(2);

			if (!container) return; // we only add button on /videos page
			if (!playlistUrl) {
				console.error('channelPlayAllButton: Cant fint Channel playlist');
				return;
			}
			const button = this.createIconButton({
				type: 'playAll',
				className: 'it-play-all-button',
				text: 'Play all',
				href: '/playlist?list=UU' + playlistUrl
			});
			container.appendChild(button);
		} else {
			document.querySelector('.it-play-all-button')?.remove();
		}
	}
};
