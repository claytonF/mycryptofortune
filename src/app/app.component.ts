import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { environment } from './../environments/environment';
import { Renderer2 } from '@angular/core';

// Interfaces
interface FiatValues {
  key: Number;
  val: Number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  FiatValues: Array<FiatValues> = []
  interimValues:any = [];
  exchange: any;
  held: any;
  assetData:any = [];
  totalValueUsd: any = 0;
  totalValueGbp: any = 0;
  totalProfit: any = 0;
  formdata:any;
  editAssetformdata: any;
  assetAbbrev: any;
  assetName: any;
  assetHeld: any;
  assetWallet: any;
  assetInvested: any;
  storedCurrenciesString: any;
  currentProfit:any;
  previousProfit: any;
  profitDifference: any;
  assetList: any = [];
  endpoint: any = 'https://data.messari.io/api/v1/assets';
  storedCurrencies: any = [];
  fixerEndpoint: string = `http://data.fixer.io/api/latest?access_key=${environment.access_key}&format=1&symbols=USD,GBP`

  constructor(
    private http: HttpClient,
    private render:Renderer2
    ) { }

    ngOnInit() {
      this.getCryptoList(this.endpoint);
      this.calculateAssetData();
      this.formdata = new FormGroup({
        assetAbbrev: new FormControl(),
        assetHeld: new FormControl(),
         assetWallet: new FormControl(),
        assetInvested: new FormControl(),
        assetSortOrder: new FormControl(),
      });
      this.editAssetformdata = new FormGroup({
        assetAbbrev: new FormControl(),
        assetName: new FormControl(),
        assetHeld: new FormControl(),
         assetWallet: new FormControl(),
        assetInvested: new FormControl(),
        assetSortOrder: new FormControl(),
      });
    }
  
  
  refreshDate() {
    this.currentProfit = localStorage.getItem('previousProfit');
    this.calculateAssetData();

  }

  calculateAssetData() {
    this.resetData();
    let assets:any = this.getAssetsFromLocalStorage();
    let jsonAssets = JSON.parse(assets);
    this.getFiatRate(this.fixerEndpoint).subscribe((res: any) => {
      this.FiatValues.push(res.rates);
      for (const [key, value] of Object.entries(this.FiatValues[0])) {
        this.interimValues.push(1 / value);
      }
      this.exchange = this.interimValues[1] / this.interimValues[0];
      jsonAssets.forEach((currency:any) => {
        this.getCryptoData(this.endpoint, currency.assetAbbrev).subscribe((res:any) => {
          if(res.data) {
            currency.assetName = res.data.slug;
            currency.priceUsd = res.data.market_data.price_usd;
            currency.priceGbp = res.data.market_data.price_usd / this.exchange;
            currency.valueGbp = currency.priceGbp * currency.assetHeld;
            currency.valueUsd = currency.priceUsd * currency.assetHeld;
            currency.profitGbp = currency.valueGbp - currency.assetInvested;
            this.assetData = this.assetData || [];
            this.assetData.push(currency);
            this.assetData.sort((a:any, b:any) => parseFloat(a.assetSortOrder) - parseFloat(b.assetSortOrder));
            console.log(this.assetData);
            this.calculateTotals(this.assetData);
            this.resetEditForm();
            this.resetAddForm();
          } else {
            console.log("rate limit exceeded");
          }
        });
      });
    });
  }

  getCryptoData(endpoint:any, currency: any) {
    return this.http.get(endpoint + '/' + currency + '/metrics');
  }

  getCryptoList(endpoint:any) {
    return this.http.get(endpoint).subscribe((res:any) => {
      let tempAssetList = res.data;
      tempAssetList.forEach((asset:any) => {
        this.assetList.push({'symbol': asset.symbol, 'name': asset.name});
        return this.assetList;
      });
    });
  }
  getFiatRate(endpoint:any) {
    return this.http.get(endpoint);
  }

  resetData() {
    this.assetData = [];
    this.totalValueUsd = 0;
    this.totalValueGbp = 0;
    this.totalProfit = 0;
  }

  addAsset(data:any, event:any) {
    this.saveAssetsToLocalStorage(data)
    this.calculateAssetData();
    this.flipCardBack(event);
 }

  saveAssetsToLocalStorage(asset:any) {
    let assetsFromLocalStorage:any  = this.getAssetsFromLocalStorage();
    let jsonAssets = JSON.parse(assetsFromLocalStorage);
    let tempAssetList:any = [];
    if (assetsFromLocalStorage !== null) {
      jsonAssets.forEach((asset:any) => {
        tempAssetList.push(asset);
      })
      tempAssetList.push(asset); 
    } else {
      tempAssetList.push(asset); 
    }
    localStorage.setItem('assetData', JSON.stringify(tempAssetList));
  }

  getAssetsFromLocalStorage() {
    return localStorage.getItem('assetData');
  }

  calculateTotals(assets:any) {
    this.totalValueUsd = 0;
    this.totalValueGbp = 0;
    this.totalProfit = 0;
    assets.forEach((asset:any) => {
      this.totalValueUsd = this.totalValueUsd + asset.valueUsd;
      this.totalValueGbp = this.totalValueGbp + asset.valueGbp;
      this.totalProfit = this.totalProfit + asset.profitGbp;
      localStorage.setItem('previousProfit', this.totalProfit);
      this.calculateProfitDifference();
    })
  }

  setEditAssetFormData(assetData:any, event:any) {
    this.editAssetformdata.controls['assetHeld'].setValue(assetData.assetHeld);
    this.editAssetformdata.controls['assetInvested'].setValue(assetData.assetInvested);
    this.editAssetformdata.controls['assetWallet'].setValue(assetData.assetWallet);
    this.editAssetformdata.controls['assetAbbrev'].setValue(assetData.assetAbbrev);
    this.editAssetformdata.controls['assetName'].setValue(assetData.assetName);
    this.editAssetformdata.controls['assetSortOrder'].setValue(assetData.assetSortOrder);
    this.flipCard(event);
  }

  cancelEditAssetFormData(event:any) {
    this.flipCardBack (event);
  }

  updateAsset(data:any) {
    let updatedAssetIndex = this.assetData.findIndex(
      (asset:any) => asset.assetAbbrev === data.assetAbbrev
    );
    this.assetData.splice(updatedAssetIndex, 1);
    let tempCurrency = JSON.stringify(this.assetData);
    localStorage.setItem('assetData', tempCurrency);
    this.saveAssetsToLocalStorage(data);
    this.calculateAssetData();

  }

  deleteAsset(data:any) {
    let updatedAssetIndex = this.assetData.findIndex(
      (asset:any) => asset.assetAbbrev === data.assetAbbrev
    );
    this.assetData.splice(updatedAssetIndex, 1);
    console.log(this.assetData);
    let tempCurrency = JSON.stringify(this.assetData);
    localStorage.setItem('assetData', tempCurrency);
    this.calculateAssetData();
  }

  flipCard(event:any) {
    let nodeList = document.querySelectorAll('.asset');
    nodeList.forEach((node) => {
      node.className = 'asset';
    })
    this.render.addClass(event.target.parentElement.parentElement.parentElement.parentElement.parentElement,"asset-flip");
  }
  flipCardBack(event:any) {
    this.render.removeClass(event.target.parentElement.parentElement.parentElement.parentElement.parentElement,"asset-flip");
  }

  resetEditForm() {
    this.editAssetformdata.reset();
  }
  resetAddForm() {
    this.formdata.reset();
  }

  calculateProfitDifference() {
    this.profitDifference = parseFloat(this.totalProfit) - parseFloat(this.currentProfit);
  }
}


// the sequence oninit
// all I really want to store inn LC is the list of assets - not values 
// and caclulate prices etc oninit

// when add an asset:
// 1. Add asset abbreviation to localstorage
// 2. retrieve all assets from localstorage and for each one calculate all asset data and save to assetData const

// when init page
// 1. retrieve all assets from localstorage and for each one calculate all asset data and save to assetData const

// when delete an asset
// 1. remove asset abbreviation for asset from localstorage
// 2. retrieve all assets from localstorage and for each one calculate all asset data and save to assetData const

// when update an asset
// 2. retrieve all assets from localstorage and for each one calculate all asset data and save to assetData const
