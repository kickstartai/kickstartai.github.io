// JavaScript Document
MyLibrary.tokenAamount = 0;
MyLibrary.tokenBamount = 0;
MyLibrary.ethBalance = 0;
MyLibrary.TokensBalance = 0;
MyLibrary.delegatedBal = 0;
MyLibrary.sellRate = 0;
MyLibrary.buyRate = 0;
MyLibrary.claimsource = 1;//wallet source default
MyLibrary.SL_lessor = "0x00";

//CALLS
$(document).ready(async function(){
	//proceed
	var unlockState = await unlockedWallet();
	if (unlockState === true){
		//repeat, with async and promise so it dont overspill
		const setatmIntervalAsync = (fn, ms) => {
			fn().then(() => {
				setTimeout(() => setatmIntervalAsync(fn, ms), ms);
			});
		};
		setatmIntervalAsync(async () => {
			callPageTries();
		}, 30000);
	}else{
		reqConnect();
	}
});

/*
PAGE'S CUSTOM TRIES: each page's callPageTries() 
=========================================================================*/
async function callPageTries(){

	//Update Rate First, we are in portfolio
	MyLibrary.sellRate = await tokenInst.methods._sellRate().call();
	MyLibrary.buyRate = await tokenInst.methods._buyRate().call();

	//Claims card
	claimCardsRefresh();

	//Benefactors
	benefactorsCard();

	//Static
	portfolioRefresh();

	//Tax Status
	try{
		tokenInst.methods.isTaxExcluded(MyLibrary.wallet).call().then(function (result,error) {
			if(result == true){
				$('#sect_tax').empty().append('true');
			}else{
				$('#sect_tax').empty().append('false');
			}
		});
	}catch(error) {
		console.log(error); 
	}
}
async function tokenETHprice(){
	try {
		var price = await tokenInst.methods.price().call();
		var pricein_eth = fromWeiToFixed12(price);
		return pricein_eth;
	}catch(error){
		return 0;
	}
}
//STAKE FUNCTION IS SWAP.JS ********
//Stake tokens
async function stakeTokens(tokens){
	//check for existing stake already
	//if exists then show swal with warning about overwriting duration
	var text = "If you already have an existing Stake, only amount will be updated, duration and expiry will not be affected.";
		swal({
			title: "Staking",
			type: "info", //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			text: text,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
	//prepare values
	var tokens = web3.utils.toWei(String(tokens), 'ether');
	var stakeAmnt = web3.utils.toBN(tokens);//received in wei
	
	//estimate gasLimit
	var encodedData = tokenInst.methods.stakeTokens(stakeAmnt).encodeABI();
	var estimateGas = await web3.eth.estimateGas({//gas estimation error can occur because indeed its overpricing even the local network test Tx such that its > bal
		data: encodedData,
		from: MyLibrary.wallet,
		to: MyLibrary.tokenAddress
	});
	// estimate the gasPrice
	var gasPrice = await web3.eth.getGasPrice(); 
	//transaction
	tokenInst.methods.stakeTokens(stakeAmnt).send({from: MyLibrary.wallet, gasPrice: gasPrice, gasLimit: estimateGas})
	.on('receipt', function(receipt){//listen
		console.log('Mined', receipt);
        if(receipt.status == true){//1 also matches true
			
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {
		
    })
	.on('error', (error) => {//listen
		var text = error.message;
		console.log(error);
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
//TRANSACTION NOTIFICATION
tokenInst.events.Staked()
	.on('data', function(event){
		//if(event.from != MyLibrary.wallet){return;}
		console.log(event); 
		var tokens = event.returnValues[2];
		var expiry = event.returnValues[1];
		var expires = new Date(expiry * 1000).toLocaleString();
		var tx_hash = event.transactionHash;
		var stakedTokens = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		
		var outputCurrency = '';//using nonTxBased message with empty currency
		var type = 'success';//or error
		var wallet = '';
		var message = 'Staked Successfully';
		var nonTxAction = Number(stakedTokens).toLocaleString()+' GUN, Expires: '+expires;
		popupSuccess(type,outputCurrency,tx_hash,message,0,0,wallet,nonTxAction);
		stakedBal();
		port_tokensStaked();
	})
	.on('changed', function(event){
		// remove event from local database
		console.log(event);
	})
	.on('error', console.error);

//Stake balance 
async function stakedBal(){
	var amount = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
	var tokens = (amount[0] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	$('#stakedBal').empty().append(' bal: '+tokens);
}
//Unstake tokens
async function unstakeTokens(inputAmnt){
	//to Big Number inputs
	var tokens = web3.utils.toWei(String(inputAmnt), 'ether'); 
	var stakeAmnt = web3.utils.toBN(tokens);

	//estimate gasLimit
	var encodedData = tokenInst.methods.unstake(stakeAmnt).encodeABI();
	var estimateGas = await web3.eth.estimateGas({
		data: encodedData,
		from: MyLibrary.wallet,
		to: MyLibrary.tokenAddress
	});
	// estimate the gasPrice
	var gasPrice = await web3.eth.getGasPrice();

	//Send
	tokenInst.methods.unstake(stakeAmnt).send({from: MyLibrary.wallet, gasPrice: gasPrice, gasLimit: parseInt(estimateGas)})
	.on('receipt', function(receipt){//listen
        if(receipt.status == true){//1 also matches true
            console.log('Mined', receipt);
        }
        else{
            console.log('Transaction Failed Receipt status: '+receipt.status);
            swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
        }
	})
	.on('confirmation', (confirmationNumber, receipt) => {

    })
	.on('error', (error) => {//listen
		var text = error.message;
		swal({
			title: "Cancelled.",
			type: "error",
			allowOutsideClick: true,
			text: text,
			html: false,
			confirmButtonColor: "#8e523c"
		});
	});
}
//TRANSACTION NOTIFICATION
tokenInst.events.Unstaked()
	.on('data', function(event){
		//if(event.from != MyLibrary.wallet){return;}
		console.log(event); 
		
		var tokens = event.returnValues[1];
		var sixerstatus = event.returnValues[2];//returns true/false - see getStakeData result
		if(sixerstatus == true){
			var sixerNotify = '<p class="markgreen">Staking will also qualify you to participate in funding rounds.</p>'
		}else{
			var sixerNotify = '';
		}
		var tx_hash = event.transactionHash;
		var stakedTokens = (tokens / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		
		var outputCurrency = '';//using nonTxBased message with empty currency
		var type = 'success';//or error
		var wallet = '';
		var message = 'unStaked Successfully';
		var nonTxAction = Number(stakedTokens).toLocaleString()+' Tokens. '+sixerNotify;
		popupSuccess(type,outputCurrency,tx_hash,message,0,0,wallet,nonTxAction);
		stakedBal();
	})
	.on('changed', function(event){
		// remove event from local database
		console.log(event);
	})
	.on('error', console.error);

//Stake balance 
async function stakedBal(){
	var amount = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
	var tokens = (amount[0] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	$('#stakedBal').empty().append(' bal: '+tokens);
}
//Reward Claims Cards Data
async function claimCardsRefresh(){
	if(window.atmChecks){	clearInterval(window.atmChecks);	}

	if(MyLibrary.claimsource ==1){
		//wallet balance
		var walletbalance = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
		var walletbalance = (walletbalance / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		var walletbalance = parseFloat(walletbalance);//float so we can add the values not concate

		$('#sect_claims_w').empty().append(walletbalance+' Tokens');
		//Claims To Date
		try{
			var rewarded_eth = await tokenInst.methods._netEthRewardedWallet(MyLibrary.wallet).call();
			var rewarded_eth = fromWeiToFixed8(rewarded_eth);
			$('#sect_claimed_w').empty().append(rewarded_eth + ' eth');
		}catch(error) {
			console.log(error); 
		}
		//Rewards Due
		try{var address = MyLibrary.wallet;
			if (address.length >= 40 && web3.utils.isAddress(address) == true) {
				var reward_due = await tokenInst.methods.currentRewardForWallet(MyLibrary.wallet).call();
				var reward_due = fromWeiToFixed8(reward_due);
				$('#sect_due_w').empty().append(reward_due + ' eth');	
			}
		}catch(error) {
			console.log(error); 
		}
	}
}

async function benefactorsCard(){
	try{//collected checked on beneficiary wallet
		var donorRewards = await tokenInst.methods.currentDonorRewards(MyLibrary.wallet).call();
		var donors_count = parseFloat(donorRewards[0]);
		var reward_due = fromWeiToFixed8(donorRewards[1]);
		if(donors_count > 0){
			//display
			$('#claim_fmb').css('display', 'block');
			$('#bene_count').empty().append(donors_count + ' wallets');
			$('#bene_value').empty().append(reward_due + ' eth');
		}else if(donors_count == 0){//no donors
			$('#claim_fmb').css('display', 'none');
			$('#bene_count').empty().append(donors_count + ' wallets');
			$('#bene_value').empty().append('0 eth');
		}
	}catch(error) {
		console.log(error); 
	}
}

async function claimRewardsMultiSource(claimCallOrigin){
	var gasPrice = await web3.eth.getGasPrice(); // estimate the gas price 
	if(claimCallOrigin == 1){
		if(MyLibrary.claimsource ==1){//wallet tokens claim Tx
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimReflection().encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimReflection().send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}
	}
	//transaction package
	ClaimFunction
	.on('receipt', function(receipt){//listen
		if(receipt.status == true){//1 also matches true
			console.log('Claim Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
		}else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	})
	.on('confirmation', function(confirmationNumber, receipt){//listen
		
	})
	.on('error', function (error) {//listen
		var text = error.message; 
		swal({
			title: "Rewards Claiming Failed.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#171716"
		});
		console.log(error);
	});
}

async function claimRewardsMultiSource(claimCallOrigin){
	var gasPrice = await web3.eth.getGasPrice(); // estimate the gas price 
	if(claimCallOrigin == 1){
		if(MyLibrary.claimsource ==1){//wallet tokens claim Tx
			//estimate gasLimit
			var encodedData = tokenInst.methods.claimReflection().encodeABI();
			var estimateGas = await web3.eth.estimateGas({data: encodedData,from: MyLibrary.wallet,to: MyLibrary.tokenAddress});
			//construct Tx
			var ClaimFunction = tokenInst.methods.claimReflection().send({from: MyLibrary.wallet,gasPrice: gasPrice,gasLimit: estimateGas,})
		}
	}
	//transaction package
	ClaimFunction
	.on('receipt', function(receipt){//listen
		if(receipt.status == true){//1 also matches true
			console.log('Claim Mined', receipt);//console.log('Transaction Success. Receipt status: '+receipt.status);console.log('Tx_hash: '+receipt.transactionHash);
		}else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",allowOutsideClick: true,confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	})
	.on('confirmation', function(confirmationNumber, receipt){//listen
		
	})
	.on('error', function (error) {//listen
		var text = error.message; 
		swal({
			title: "Rewards Claiming Failed.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#8e523c"
		});
		console.log(error);
	});
}
//TRANSACTION NOTIFICATION
tokenInst.events.ClaimReflection()
	.on('data', async function(event){
		//if(event.from != MyLibrary.wallet){return;}
		console.log(event);
		var reward = event.returnValues[1];
		var owner = event.returnValues[0];

			var first = owner.substring(0, 6);//get first chars
			var last = owner.slice(owner.length - 3);//get last chars
			var privatize = first+'..'+last;

		var tx_hash = event.transactionHash;
		var receivedETH = fromWeiToFixed8(reward);//show crumbs
		var stakeTokens = 0;
		var outputCurrency = '';//using nonTxBased message with empty currency
		var type = 'success';//or error
		var wallet = '';

		if(owner != MyLibrary.wallet){//beneficiary claimed
			var message = 'Beneficiary Rewards Claimed';
			var nonTxAction = receivedETH+' eth, from benefactor: '+privatize;
			port_beneficiary(owner);//refresh - Top Claim Card Right
		}else{//owner claimed
			var message = 'Rewards Claimed';
			var nonTxAction = receivedETH+' eth, into wallet: '+privatize;
			claimCardsRefresh();//refresh - Top Claim Card Left
		}
		popupSuccess(type,outputCurrency,tx_hash,message,receivedETH,stakeTokens,wallet,nonTxAction);
	})
	.on('changed', function(event){
		// remove event from local database
		console.log(event);
	})
	.on('error', console.error);

//Beneficiary Wallet Set
function setBeneficiaryWallet(wallet){
	if (wallet.length >= 40 && web3.utils.isAddress(wallet) == true) {}else{console.log("Invalid address provided"); return;}
	
	//transaction
	tokenInst.methods.addBeneficiary(wallet).send({
		from: MyLibrary.wallet
	})
	.on('receipt', function(receipt){
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	 })
	.on('confirmation', function(confirmationNumber, receipt){//listen
		var receipt = receipt;
		var tx_hash = receipt.transactionHash;
		var first = wallet.substring(0, 10);//get first chars
		var last = wallet.slice(wallet.length - 5);//get last chars
		var nonTxAction = first+'..'+last;

		 if (confirmationNumber === 2) {
			 var type = 'success';//or error
			 var outputCurrency = '';
			 popupSuccess(type,outputCurrency,tx_hash,'Beneficiary Wallet Set',0,0,'',nonTxAction);
			 $('#beneficiaryWallet').empty().append(wallet);
			 swal.close();
		}
	})
	.on('error', function (error) {//listen
		var text = error.message;  
		swal({
			title: "Failed to add Beneficiary.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#171716"
		});
	});
}
//Beneficiary Wallet Set
function beneficiarySetting(){
	var privatize = '<div class="shl_inputshold delegate_inputshold setBeneField"><input id="submitwallet" class="shldi benown" aria-invalid="false" autocomplete="off" title="once an address is set it will be able to claim your ETH rewards. to remove beneficiary, simply click remove"><br><div class="beneCurrent"><span>Beneficiary: </span><span id="beneficiaryWallet"></span><span id="removeWallet" title="remove beneficiary">x</span></div></div>';
	swal({
			title: "Set/Unset Beneficiary Wallet",
			text: privatize,
			type: "prompt",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			html: true,
					dangerMode: true,
					confirmButtonText: "Set Wallet",
					confirmButtonColor: "#171716", //cowboy brown
					cancelButtonText: "Close",
					closeOnConfirm: false,
					showLoaderOnConfirm: true,
			showConfirmButton: true,
			showCancelButton: true,
			timer: 4000,
			animation: "slide-from-top"
	},function(){//on confirm click
		var address = $('#submitwallet').val();
		setBeneficiaryWallet(address);
	});//confirm swal close
	
	//show current beneficiary
	document.getElementById("submitwallet").placeholder = "set wallet address as beneficiary..";
	atmChecks = setTimeout( function() {
		var address = MyLibrary.wallet;
		try{
			tokenInst.methods._claimBeneficiary(address).call().then(function (result,error) {
				if(web3.utils.toBN(result).isZero()){//zero address check 0x00
					var result = MyLibrary.wallet;
				}
				$('#beneficiaryWallet').empty().append(result);
			});
		}catch(error) {
			console.log(error); 
		}
	}, 1000);
}
//Remove Beneficiary Wallet
async function removeBeneficiary(){
	var beneficiary = await tokenInst.methods._claimBeneficiary(MyLibrary.wallet).call();
	//transaction
	tokenInst.methods.removeBeneficiary(beneficiary).send({from: MyLibrary.wallet})
	.on('receipt', function(receipt){
		if(receipt.status == true){//1 also matches true
			console.log('Mined', receipt);
		}
		else{
			console.log('Transaction Failed Receipt status: '+receipt.status);
			swal({title: "Failed.",type: "error",confirmButtonColor: "#F27474",text: "Transaction Failed Receipt status: "+receipt.status});
		}
	 })
	.on('confirmation', function(confirmationNumber, receipt){//listen
		var wallet = beneficiary;
		var first = wallet.substring(0, 10);//get first chars
		var last = wallet.slice(wallet.length - 5);//get last chars
		var nonTxAction = first+'..'+last;

		 if (confirmationNumber === 2) {
			 var type = 'success';//or error
			 var outputCurrency = '';
			 popupSuccess(type,outputCurrency,'','Beneficiary Wallet Removed',0,0,'',nonTxAction);
			 swal.close();
		}
	})
	.on('error', function (error) {//listen
		var text = error.message;  
		swal({
			title: "Failed to remove Beneficiary.",
			type: "error",
			text: text,
			html: false,
			allowOutsideClick: true,
			confirmButtonColor: "#171716"
		});
	});
}
function resetClaimFields(){
	$('#sect_claims_w').empty().append('---');
	$('#sect_claimed_w').empty().append('---');
	$('#sect_due_w').empty().append('---');
}
//claims history
function rewardsClaimed(){
	return new Promise(function(resolve, reject) {// Creating a XHR object
		const xhr = new XMLHttpRequest();
		const url = MyLibrary.AlchemyURL;
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				var parsed = JSON.parse(this.responseText);
				if(parsed.hasOwnProperty('error')){//click or call again after a min timeout
					//var stringified = JSON.stringify(parsed);
					console.log('retry in progress, error on last fetch: '+result.error);//if it returns objects, just log stringified
					rewardsClaimed();
				}else{
					process_claims_todate(parsed);
				}
			}
		};		
		//converting JSON data to string
		var abi = MyLibrary.contractABI;
		var fromBlockHEX = '0x'+(30111000).toString(16);//to_hex.. from_hex = parseInt(hexString, 16);
		var address_encoded = web3.eth.abi.encodeParameter('address', MyLibrary.wallet);
		//event signature
		if(MyLibrary.claimsource == 1 || MyLibrary.claimsource == 4){var eventSignature = "0xedfd1f5aaee60f4be9ef12702ca2d1016ebce9d8fd3f0e11d7080fd43d12cc84";}
		if(MyLibrary.claimsource == 2){var eventSignature = "0x10d7dba82e80cd40ab7be3edd8a086dfbd9de77bfd704b3c92fad61107984906";}
		if(MyLibrary.claimsource == 3){var eventSignature = "0xb9d645858ab727bc03340723bceed2cb8b1b6ff2cbb0045673f446905c98bddc";}
		if(MyLibrary.claimsource == 4){//just address now, signature set already
			var address = $('#claimfromwallet').val();
			if (address.length >= 40 && web3.utils.isAddress(address) == true) {
				var address_encoded = web3.eth.abi.encodeParameter('address', address);	
			}else{
				swal({title: "Invalid Address Provided.",type: "error",text: "check benefactor wallet address above..",html: false,allowOutsideClick: true,confirmButtonColor: "#171716"});
			}
		}
		//construct
		var data = JSON.stringify({"jsonrpc": "2.0","id": 0,"method": "eth_getLogs","params": [{
						  "fromBlock": fromBlockHEX,
						  "address": MyLibrary.tokenAddress,
						  "topics": [eventSignature,address_encoded] //use: https://emn178.github.io/online-tools/keccak_256.html
						}]
					});
		//sending data with the request
		xhr.send(data);
		xhr.onerror = reject;
	});
}

function process_claims_todate(parsed){
	//console.log(parsed);
	//console.log(parsed.id);
	//console.log(parsed.result[0].data);// value claimed
	var claims_ = parsed.result;
	var number_of_claims = MyLibrary.number_of_claims = parsed.result.length;
	var receiver = MyLibrary.wallet;
	var list_tree = '';
	window.total_claims = 0;
	if(number_of_claims > 0){
		for (var i = 0; i < number_of_claims; i++) {
			var claimerfromHex  = parseInt(claims_[i].topics[2], 16);//2nd topic is claimer
			var ethReward = fromWeiToFixed8(claims_[i].data);//pass hex			
			var ethReward = parseFloat(ethReward);//float so we can add the values not append
			if(ethReward > 0 && claimerfromHex == receiver){ 
				var tx_hash = claims_[i].transactionHash.slice(0, 12);//trim to max 10
				var transfer = '<li class="claimtx"><span class="claim_tag">Claimed: </span><span class="reward_tag">'+ ethReward + ' eth, </span><span class="tx_tag"><a href="'+MyLibrary.etherScan+'/tx/'+claims_[i].transactionHash+'" target="_blank">TxHash: ' + tx_hash + '...</a></span></li>';
				window.total_claims += ethReward;
				var list_tree = list_tree + transfer;
				
				if(i == number_of_claims-1){//last item, since we loop from 0 not 1
					var chd = '<div class="claimsum">'+window.total_claims+' eth</div><div class="clms_case">'+list_tree+'</div>';
					swal({
						title: "Claims History",
						text: chd,
						html: true,
						showCancelButton: false,
						dangerMode: true,
						confirmButtonText: "Cool",
						confirmButtonColor: "#171716",
						closeOnConfirm: true
					});
				}
			}
		}//close for
	}else{//no claims yet popup
		console.log('No claims yet...');
		$('#sect_claimed').empty().append(number_of_claims+' claims');
		var privatize = '<div class="clms_case">No rewards claimed yet...</div>';
		swal({
			  title: "0 Claims",
			  text: privatize,
			  type: "info",  //var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];
			  html: true,
						dangerMode: true,
						confirmButtonText: "Okay",
						confirmButtonColor: "#171716", //cowboy brown
			  showConfirmButton: true,
			  showCancelButton: false,
			  timer: 4000,
			  animation: "slide-from-top"
		},function(){//on confirm click
		
		});//confirm swal close
	}
}

//portfolio refresh
async function portfolioRefresh(){
	//my beneficiary - who im donating to
	port_myBeneficiary().then(() => {
		//bonfire
		port_bonfireWallet();
	}).then(() => {
		port_staticView();
	}).then(() => {
		//staked
		port_tokensStaked();
	})
}
async function port_myBeneficiary(){
	try{
		var beneficiary = await tokenInst.methods._claimBeneficiary(MyLibrary.wallet).call();
		if(web3.utils.toBN(beneficiary).isZero() || beneficiary == MyLibrary.wallet){//zero address check 0x00 or if you removed a beneficary and reset to self
			var beneficiary = 'no beneficiary set';
			//display beneficiary wallet
			$('#pbCard_bene').empty().append(beneficiary);
		}else{
			//display beneficiary wallet
			$('#pbCard_bene').empty().append(beneficiary);
			//fetch rewards claimed
			try{
				var rewarded_eth = await tokenInst.methods._netRewardsTomyBE(MyLibrary.wallet).call();
				var fixedETH = fromWeiToFixed8(rewarded_eth);
				$('#pbCard_total').empty().append(fixedETH + ' eth');
			}catch(error) {
				console.log(error); 
			}
			//convert to USD value
			var USDvalue = fixedETH * await ETHUSDprice(); 
			var USDvalue = parseFloat(USDvalue);
			var fixed = 6;//6 is good for all esp RBW
			var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (fixed || -1) + '})?');
			var USDvalue = USDvalue.toString().match(re)[0];

			$('#pbCard_value').empty().append('$ '+USDvalue );
		}
	}catch(error) {
		console.log(error); 
	}
}

async function port_tokensStaked(){
	
	$("#dot_lsrStk").hide();
	try{
		var stakeData = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
		//check for staked tokens & show indicators
		if(stakeData[0] == 0){//nothing staked
			return;
		}else{
			$("#dot_lsrStk").css('display', 'inline-block');
			var timestamp = parseInt(Date.now()/1000);//divide by 1000 ms to get 10 digit Unix like from solidity
			if(stakeData[2] < timestamp){//expired - show unstake button
				$('#_stk_expiry').css('color', '#ff4747');//red
				$("#shl_unstake").hide();
			}else{
				$('#_stk_expiry').css('color', '#04C86C');//green
				$("#shl_unstake").show();
			}
		}
		
		var amount = (stakeData[0] / Math.pow(10, MyLibrary.decimals)).toFixed(2);
		var duration = stakeData[1];
		if(parseInt(stakeData[2]) > 0){
			var expiry = new Date(stakeData[2] * 1000).toLocaleString();
		}else{
			var expiry = '0/0/0000';
		}
		var rrpass = stakeData[3];
		if(rrpass==false){var rrpass='false';}else{var rrpass = 'true';}
		//add values
		$('#_stk_tokens').empty().append(amount);
		$('#_stk_duration').empty().append(duration); 
		$('#_stk_expiry').empty().append(expiry);
	}catch(error) {
		console.log(error); 
	}
	return;
}

//STATIC CALLS SECTION
async function port_staticView(){
	//wallet balance
	var walletbalance = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
	var walletbalance = (walletbalance / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	var walletbalance = parseFloat(walletbalance);//float so we can add the values not concate
	//acpt 
	try{
		var acpt = await averageCost();//parsed human readable return
		$('#mbcard_acpt').empty().append(acpt + ' avg-cost-per-token');
	}catch(error) {
		console.log(error); 
	}

	//average gains vs acpt fromWeiToFixed8
	try{
		var price = await tokenETHprice();//parsed human readable return
		var gainlossRaw = (walletbalance * price) - (walletbalance *acpt);
		var gainloss = gainlossRaw.toFixed(8);
		if (Math.sign(gainloss) === -1) {//if -ve
			var gainloss = '<p class="markred">'+gainloss+' eth loss</p>';
		}else{
			var gainloss = '<p class="markgreen">'+gainloss+' eth gain</p>';
		}
		$('#mbcard_avgain').empty().append(gainloss);
	}catch(error) {
		console.log(error); 
	}

	//ax Status
	try{
		var buytax = await tokenInst.methods._buyRate().call();
		var buytax = parseFloat(buytax);
		var selltax = await tokenInst.methods._sellRate().call();
		var selltax = parseFloat(selltax);
		
		var selltaxStatus = '<p class="markgreen">Sell Tax: '+selltax+'%</p>';
		var buytaxStatus = '<p class="markgreen">Buy Tax: '+buytax+'%</p>';		

		//output
		$('#mbcard_taxstatus_buy').empty().append(buytaxStatus);
		$('#mbcard_taxstatus_sell').empty().append(selltaxStatus);
	}catch(error) {
		console.log(error); 
	}
	//Blacklist Status / Bot Status
	try{
		var isBot = await tokenInst.methods.isBot(MyLibrary.wallet).call();
		//if added as bot
		if(isBot == true){
			$('#mbcard_blacklisted').empty().append('<p class="markred">Bot Account</p>');
			$('#mbcard_blacklistRights').empty().append('Your tokens are restricted.');
		}else if(isBot == false){
			$('#mbcard_blacklisted').empty().append('<p class="markgreen">Clean Account</p>');
			$('#mbcard_blacklistRights').empty().append('You can: Sell or Claim Rewards.');
		}
	}catch(error) {
		console.log(error); 
	}
	//NET WORTH 
	try{
		//-staked
		var stakeData = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
		var stakedTokens = 0;
		if(stakeData[0] > 0){
			var stakedTokens = (stakeData[0] / Math.pow(10, MyLibrary.decimals)).toFixed(0);
			var stakedTokens = parseFloat(stakedTokens);
		}
		
		//NET ASSETS COMBINED
		var netAssetBasket = walletbalance + stakedTokens;
		var netAssetBasketDisplay = Number(netAssetBasket).toFixed(2)
		//-nET Worth
		var netWorth = (netAssetBasket * price).toFixed(8);
		//breakdown
		var walletPerce = (walletbalance / netAssetBasket * 100).toFixed(1);
		var stakedPerce = (stakedTokens / netAssetBasket * 100).toFixed(1);
		//-isZero
		if(netAssetBasket == 0){
			$('#mbcard_netassets').empty().append(0 + ' Tokens (wallet,staked)');
			$('#mbcard_netassetsValue').empty().append(0 + ' ETH NetWorth');
		}else{
			$('#mbcard_netassets').empty().append(netAssetBasketDisplay + ' Tokens {wal '+walletPerce+'%, staked '+stakedPerce+'%}');
			$('#mbcard_netassetsValue').empty().append('<p class="markgreen">'+netWorth+' ETH NetWorth</p>');
		}
	}catch(error) {
		console.log(error); 
	}
	//NET REWARDS CLAIMED
	try{
		var rewarded_ethW = 0;  var rewarded_ethB = 0;
		//-rewards wallet
		var rewardsDataW = await tokenInst.methods._netEthRewardedWallet(MyLibrary.wallet).call();
		var rewarded_ethW = fromWeiToFixed8(String(rewardsDataW));//string result of toFixed
		var rewarded_ethW = parseFloat(rewarded_ethW);
		//-rewards beneficiary
		var rewardsDataB = await tokenInst.methods._netRewardsmyDonors(MyLibrary.wallet).call();
		var rewarded_ethB = fromWeiToFixed8(rewardsDataB);//string result of toFixed
		var rewarded_ethB = parseFloat(rewarded_ethB);

		//NET
		var netRewardsClaimed = Number(rewarded_ethW);//here to fixed turns it to human readable. not parseFloat. try it
		//display
		if(netRewardsClaimed == 0){
			$('#mbcard_netrewards').empty().append(0 + ' eth');
			$('#mbcard_netrewardsBreakdown').empty().append('{wallet: '+0+', donors: '+0+'}');
		}else{
			$('#mbcard_netrewards').empty().append('<p class="markgreen">'+netRewardsClaimed.toFixed(8)+' eth</p>');
			$('#mbcard_netrewardsBreakdown').empty().append('{wallet: '+rewarded_ethW.toFixed(8)+'eth, donors: '+rewarded_ethB.toFixed(8)+'eth}');
		}
	}catch(error) {
		console.log(error); 
	}
	//NET REWARDS UNCLAIMED
	try{
		var reward_ethWD = 0;
		//-rewards wallet
		var rewardsDataWD = await tokenInst.methods.currentRewardForWallet(MyLibrary.wallet).call();
		var reward_ethWD = fromWeiToFixed12(rewardsDataWD);//string result of toFixed
		var reward_ethWD = Number(reward_ethWD);//parsed to enable math
		//-rewards donors
		var benefactorsArray = await tokenInst.methods.viewBenefactors().call({from: MyLibrary.wallet});
		var number_of = benefactorsArray.length;
		//console.log('number of: '+number_of)
		MyLibrary.reward_ethBD = 0;
		if(number_of > 0){
			let array = benefactorsArray;
			for (const donor of array){
				var rewardDue = await tokenInst.methods.currentRewardForWallet(donor).call();
				var reward_due = fromWeiToFixed8(rewardDue);
				MyLibrary.reward_ethBD += Number(reward_due);//so we can add
			}
		}
		var reward_ethBD = MyLibrary.reward_ethBD;
		

		//TOTAL
		var netRewardsDue = Number(reward_ethWD + reward_ethBD);//here to fixed turns it to human readable. not parseFloat. try it
		//breakdown
		var walletPerce = (reward_ethWD / netRewardsDue * 100).toFixed(1);
		var donorPerce = (reward_ethBD / netRewardsDue * 100).toFixed(1);
		//display
		if(netRewardsDue == 0){
			$('#mbcard_netrewardsD').empty().append(0 + ' eth');
			$('#mbcard_netrewardsDBreakdown').empty().append('{wal '+0+'%, donors '+0+'%}');
		}else{
			$('#mbcard_netrewardsD').empty().append('<p class="markgreen">'+netRewardsDue.toFixed(8)+' eth</p>');
			$('#mbcard_netrewardsDBreakdown').empty().append('{wal '+walletPerce+'%, donors '+donorPerce+'%}');
		}
	}catch(error) {
		console.log(error); 
	}	
}
async function averageCost(){
	var balance = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
	var balance = (balance / Math.pow(10, MyLibrary.decimals)).toFixed(2);
	var balance = parseFloat(balance);//float so we can add the values not append
	if(balance > 0){//hate seeing the revert error so only if the user bought some(not perfect)
		try{
			var asvArray = await tokenInst.methods.acpt(MyLibrary.wallet).call();
			var asv = web3.utils.fromWei(asvArray, "ether");
			var asv = Number(asv).toFixed(12);
			return asv;	
		}catch (error) {
			console.log(error.data);
			return 0;
		}
	}else{
		return 0;
	}
}
async function ETHUSDprice(){
	
	//Manual addresses for now, using MyLibrary gives error somehow
	const UNISWAP_FACTORY_ADDR = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
	const USDC = MyLibrary.usdcContractAdd;
	const WETH = MyLibrary.wethAddress;
	var uniswapAbi = [{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]; // get the abi from https://etherscan.io/address/0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc#code
	var factoryABI = [{"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token0","type":"address"},{"indexed":true,"internalType":"address","name":"token1","type":"address"},{"indexed":false,"internalType":"address","name":"pair","type":"address"},{"indexed":false,"internalType":"uint256","name":"","type":"uint256"}],"name":"PairCreated","type":"event"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allPairs","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allPairsLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"}],"name":"createPair","outputs":[{"internalType":"address","name":"pair","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"feeTo","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"feeToSetter","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"getPair","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeTo","type":"address"}],"name":"setFeeTo","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_feeToSetter","type":"address"}],"name":"setFeeToSetter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
	var factory = new web3.eth.Contract(factoryABI, UNISWAP_FACTORY_ADDR);
  	var pairAddress = await factory.methods.getPair(WETH, USDC).call();
	  //alert(pairAddress) //should return valid address not 0x00
	var pair = new web3.eth.Contract(uniswapAbi, pairAddress);
	var reserves = await pair.methods.getReserves().call();
	console.log(pairAddress);
	console.log(reserves);
	console.log(reserves[1] / (reserves[0] * 1e12));
	
	return 1400;//for now
	
}
//========================================================================
//CLICK INITIATED CALLS
//HANDLE ALL EVENTS HERE
//change claim source
$(document).on('click', '#cs_1', function(e){
	MyLibrary.claimsource = 1;//wallet
	document.getElementById("claimfrom").innerHTML = "from Wallet";
	resetClaimFields();
	claimCardsRefresh();
});
$(document).on('click', '#cs_2', function(e){
	MyLibrary.claimsource = 2;//share lease
	document.getElementById("claimfrom").innerHTML = "from Lease";
	resetClaimFields();
	claimCardsRefresh();
});
$(document).on('click', '#cs_3', function(e){
	MyLibrary.claimsource = 3;//staked
	document.getElementById("claimfrom").innerHTML = "from Staked & Reimburse";
	resetClaimFields();
	claimCardsRefresh();
});
//claim rewards: from HypeCards section & claim cards
// - just point where you want to claim from
$(document).on('click', '#_portBtnClaim', function(e){
	var claimCallOrigin = 1;//Top Claim Card Left
	MyLibrary.claimsource = 2;// 1 - wallet, 2 - sharelease, 3 - staked
	claimRewardsMultiSource(claimCallOrigin);
});
$(document).on('click', '#_portBtnClaimSTK', function(e){
	var claimCallOrigin = 1;//Top Claim Card Left
	MyLibrary.claimsource = 3;// 1 - wallet, 2 - sharelease, 3 - staked
	claimRewardsMultiSource(claimCallOrigin);
});
//- claim cards, dont point, the claimsource is already set in dropdown clicks
$(document).on('click', '#claim_fmw', function(e){
	var claimCallOrigin = 1;//Top Claim Card Left
	claimRewardsMultiSource(claimCallOrigin);
});
//claim from donors put separately for clarity only, othersie covered in from wallet
$(document).on('click', '#claim_fmb', function(e){
	var claimCallOrigin = 1;
	MyLibrary.claimsource = 1;
	claimRewardsMultiSource(claimCallOrigin);
});
//claims history
$(document).on('click', '#show_claims_w', function(e){
	console.log('fetching claims...');	
	rewardsClaimed();
});
//Benefactors list
$(document).on('click', '#show_benefactors', async function(e){
	console.log('fetching benefactors...');
	var benefactorsArray = await tokenInst.methods.viewBenefactors().call({from: MyLibrary.wallet});
	var number_of = benefactorsArray.length;
	
	MyLibrary.donorlist = '';
	//fetch their value
	if(number_of > 0){
		let array = benefactorsArray;
		for (const donor of array){
			console.log(donor)
			var rewardDue = await tokenInst.methods.currentRewardForWallet(donor).call();
			var reward_due = fromWeiToFixed8(rewardDue);
			//make donor list entry
			var first = donor.substring(0, 8);//get first 5 chars
			var last = donor.slice(donor.length - 5);//get last 5
			var trancatedAdd = first+'...'+last;
			var donorEntry = '<li class="beneLi"><span class="bene_tag">'+ trancatedAdd +'</span><span class="reward_tag">'+ reward_due + ' eth</span></li>';
			MyLibrary.donorlist += donorEntry;
			//display
			var chd = '<div class="benesum">'+number_of+' Benefactors</div><div class="donor_case">'+MyLibrary.donorlist+'</div>';
			swal({
				title: "Benefactors List",
				text: chd,
				html: true,
				showCancelButton: false,
				dangerMode: false,
				confirmButtonText: "Thanks!",
				confirmButtonColor: "#171716",
				closeOnConfirm: true
			});
		}
	}else if(number_of == 0){//no donors
		MyLibrary.donorlist = '<li class="claimtx"><span class="claim_tag">No benefactors found for your wallet..</span></li>';
		//display
		var chd = '<div class="claimsum">No benefactors</div><div class="clms_case">'+MyLibrary.donorlist+'</div>';
		swal({
			title: "Benefactors List",
			text: chd,
			html: true,
			showCancelButton: false,
			dangerMode: false,
			confirmButtonText: "Thanks!",
			confirmButtonColor: "#171716",
			closeOnConfirm: true
		});
	}
});
//Remove Beneficiary
$(document).on('click', '#removeWallet', function(e){
	removeBeneficiary();
});
//Stake Tokens || fund etc
$(document).on('click', '#fundmax', async function(e){
	var amount = await web3.eth.getBalance(MyLibrary.wallet);
	document.getElementById("fund_amnt").value = fromWeiToFixed5_unrounded(amount);
});
$(document).on('click', '#withdrawmax', async function(e){
	var walletProfile = await tokenInst.methods.getLiquidityFundProfile().call({from:MyLibrary.wallet});
	var walletProfileDuePF = parseFloat(walletProfile[1]);
	var walletProfileWDPF = parseFloat(walletProfile[2]);
	document.getElementById("withdraw_amnt").value = fromWeiToFixed5(String(walletProfileDuePF - walletProfileWDPF));
});
$(document).on('click', '#stkmax', async function(e){
	var amount = await tokenInst.methods.balanceOf(MyLibrary.wallet).call();
	document.getElementById("stake_amnt").value = fromWeiToFixed2_unrounded(amount);
});
$(document).on('click', '#unstkmax', async function(e){
	var amount = await tokenInst.methods.getStakeData(MyLibrary.wallet).call();
	var amount = amount[0];
	document.getElementById("unstake_amnt").value = fromWeiToFixed5_unrounded(amount);
});
$(document).on('click', '#stake', function(e){
	var inputAmnt = $('#stake_amnt').val();
	var duration = $('#stake_duration').val();
	stakeTokens(inputAmnt);
});
$(document).on('click', '#unstake', function(e){
	var inputAmnt = $('#unstake_amnt').val();
	unstakeTokens(inputAmnt);
});
//Beneficiary
$(document).on('click', '#benef_settings', function(e){
	beneficiarySetting();
});

