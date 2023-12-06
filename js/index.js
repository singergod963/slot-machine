const SlotMachine = window.SlotMachine;
const dayjs = window.dayjs;
const config = { brands: [
	{ name: '部門1', image: 'images/1.png' },
	{ name: '部門2', image: 'images/2.png' },
	{ name: '部門3', image: 'images/3.png' },
	{ name: '部門4', image: 'images/4.png' },
	{ name: '部門5', image: 'images/5.png' },
] };
const brands = config.brands.map(v => v.name);

$(function () {
	const machine1 = new SlotMachine($('#machine1')[0], { active: 0, delay: 200 });
	const machine2 = new SlotMachine($('#machine2')[0], { active: 0, delay: 400 });
	const machine3 = new SlotMachine($('#machine3')[0], { active: 0, delay: 600, onComplete: () => { $('.ename').fadeIn(); } });
	const logo = $('.logo-img img');
	$('.randomizeMachine').css('opacity', '1.0');
	changeMachineText('抽獎', 1);
	let logoAnimate;
	let brand = 0;
	for (let i = 0; i < config.brands.length; i++) {
		const img = new Image();
		img.src = config.brands[i].image;
	}
	$('.logo-img img').attr('src', config.brands[0].image).hide();

	$(window).resize(() => {
		const scaleX = $('.container').width() / 1024;
		const scaleY = $('.container').height() / 625;
		$('.fix').css('transform-origin', 'top left').css('transform', `scale(${scaleX}, ${scaleY})`);
	}).resize();

	//#region 資料載入
	$('.save').on('change', async () => {
		const file = $('.save')[0].files[0];
		const data = await file.arrayBuffer();

		/* parse and load first worksheet */
		const wb = window.XLSX.read(data);
		const ws = wb.Sheets[wb.SheetNames[0]];
		const members = window.XLSX.utils.sheet_to_json(ws).map(v => ({
			win: false,
			date: '',
			...v,
			company: `${v.company ?? ''}`,
		}));
		localStorage.setItem('members', JSON.stringify(members));
	});
	//#endregion

	//#region Sample資料下載
	$('.sample').on('click', async () => {
		// 下載 doc/名單.xlsx
		const link = document.createElement('a');
		link.setAttribute('href', 'docs/名單.xlsx');
		link.setAttribute('download', '名單.xlsx');
		document.body.appendChild(link); // Required for FF
		link.click();
	});
	//#endregion

	//#region 中獎匯出
	$('.output').on('click', async () => {
		const list = JSON.parse(localStorage.getItem('members') ?? '[]');

		const csvContent = `姓名,英文姓名,排序,中獎時間\n${list.filter(f => f.win == true).sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()).map(
			v => `${v.cname},${v.ename},${v.index},${dayjs(v.date).format('YYYY-MM-DDThh:mm:ss')}`
		).join('\n')}`;

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', `data:text/csv;charset=utf-8,%EF%BB%BF${encodedUri}`);
		link.setAttribute('download', `中獎統計資料${dayjs().format('YYYY-MM-DDThh:mm:ss')}.csv`);
		document.body.appendChild(link); // Required for FF

		link.click();
	});

	//#endregion

	//#region 抽獎
	async function getWinner (c = 1) {
		if (localStorage.getItem('members') == null) {
			alert('請先匯入名單！');
			return;
		}

		const list = JSON.parse(localStorage.getItem('members') ?? []);
		const winIndex = list.filter(f => f.win == true).length + 1;
		const noWinList = list.filter(v => v.win === false);
		if (noWinList.length < c) {
			return {};
		}

		const winner = sampleArray(noWinList, c);
		let loser = sampleArray(list, 9);
		while (loser.length < 9) { loser = [...loser, ...loser].slice(0, 9); }
		winner.forEach(v => {
			v.win = true;
			v.date = new Date();
			v.index = winIndex;
		});
		localStorage.setItem('members', JSON.stringify(list));
		return { winner, loser };
	}

	$('.fullscreen').on('click', () => {
		const elem = $('body')[0];

		if (!document.fullscreenElement) {
			elem.requestFullscreen().catch(err => {
				alert(
					`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
				);
			});
		} else {
			document.exitFullscreen();
		}
	});

	$('.start').on('click', async () => {
		if (machine1.running || machine2.running || machine3.running) { return; }
		const { winner: w, loser } = await getWinner();

		if (!w || w.length == 0) {
			alert('已抽完獎項或是沒有得獎者資料！');
			return;
		}

		startRoll(w[0], loser);
	});

	$('.stop').on('click', async () => {
		stopRoll();
	});

	function startRoll (winner, loser) {
		brand = brands.indexOf(winner.company);

		const prize = machine1.active == 0 ? 4 : 0;
		const list = [...loser];
		list.splice(prize, 0, winner);

		$.each([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10
		], (index, value) => {
			const cname = list[index].cname;
			if (value == machine1.active + 1) {
				return;
			}

			const n1 = cname.slice(0, cname.length > 2 ? -2 : -1);
			const n2 = cname.length > 2 ? cname.slice(0, -1).charAt(cname.length - 2) : '　';
			const n3 = cname.length > 1 ? cname.charAt(cname.length - 1) : '　';
			$(`#machine1 .content${value}`).text(n1);
			$(`#machine2 .content${value}`).text(n2);
			$(`#machine3 .content${value}`).text(n3);
		});

		logoAnimate = setInterval(() => {
			const current = config.brands.findIndex(f => f.image == logo.attr('src'));
			if (current != -1) {
				const next = current >= brands.length - 1 ? 0 : current + 1;
				logo.show().attr('src', config.brands[next].image);
			}
		}, 50);
		machine1.randomize = () => prize;
		machine2.randomize = () => prize;
		machine3.randomize = () => prize;
		machine1.shuffle(99999);
		machine2.shuffle(99999);
		machine3.shuffle(99999);
		$('.ename').hide().text(winner.ename);
		$('#roll')[0].play();
	}

	function stopRoll () {
		if (machine1.stopping || machine2.stopping || machine3.stopping) { return; }

		try {
			machine1.stop();
			machine2.stop();
			machine3.stop();
			clearInterval(logoAnimate);
			$('#roll')[0].pause();
			$(`#prize${sampleArray([1, 3], 1)}`)[0].play();
			logo.attr('src', config.brands[brand].image);
			console.log(brand);
		} catch (err) {
			alert(err);
		}
	}

	//#region 隨機取樣
	function sampleArray (arr, n) {
		return arr.sort(() => Math.random() - Math.random()).slice(0, n);
	}
	//#endregion

	$(window).on('keydown', e => {
		const code = e.which || e.charCode || e.keyCode;
		console.log(code);
		switch (code) {
			case 49:

				break;
			case 50:
				$('.start').trigger('click');
				break;
			case 51:
				$('.stop').trigger('click');
				break;
			case 55:
				$('.save').trigger('click');
				break;
			case 56:
				$('.output').trigger('click');
				break;
			case 57:
				$('.sample').trigger('click');
				break;
			case 70:
				$('.fullscreen').trigger('click');
				break;
		}
	});

	function changeMachineText (cname, index) {
		const n1 = cname.slice(0, cname.length > 2 ? -2 : -1);
		const n2 = cname.length > 2 ? cname.slice(0, -1).charAt(cname.length - 2) : '　';
		const n3 = cname.length > 1 ? cname.charAt(cname.length - 1) : '　';
		$(`#machine1 .content${index}`).text(n1);
		$(`#machine2 .content${index}`).text(n2);
		$(`#machine3 .content${index}`).text(n3);
	}
});