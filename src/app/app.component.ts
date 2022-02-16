import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { environment } from './../environments/environment';
import { Renderer2 } from '@angular/core';
// import 'rxjs/add/operator/catch';

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
  asset_abbrev: any;
  asset_name: any;
  asset_held: any;
  asset_wallet: any;
  asset_invested: any;
  storedCurrenciesString: any;
  currentProfit:any;
  previousProfit: any;
  profitDifference: any;
  asset_list: any = [];
  endpoint: any = 'https://data.messari.io/api/v1/assets';
  storedCurrencies: any = [];
  fixerEndpoint: string = `http://data.fixer.io/api/latest?access_key=${environment.access_key}&format=1&symbols=USD,GBP`

  constructor(
    private http: HttpClient,
    private render:Renderer2
    ) { }

    ngOnInit() {
      this.getCryptoList(this.endpoint);
      this.refreshDate();
      this.formdata = new FormGroup({
        asset_abbrev: new FormControl(),
        asset_name: new FormControl(),
        asset_held: new FormControl(),
        asset_wallet: new FormControl(),
        asset_invested: new FormControl(),
        asset_sort_order: new FormControl(),
     });
     this.editAssetformdata = new FormGroup({
      asset_abbrev: new FormControl(),
      asset_name: new FormControl(),
      asset_held: new FormControl(),
      asset_wallet: new FormControl(),
      asset_invested: new FormControl(),
      asset_sort_order: new FormControl(),
    });
    }
  
  
  refreshDate() {
    this.currentProfit = localStorage.getItem('previousProfit');
    this.resetData();
    this.storedCurrenciesString = localStorage.getItem('assetData');
    let tempAssetData = []
    tempAssetData.push(JSON.parse(this.storedCurrenciesString));
    this.assetData = tempAssetData[0];
    if(this.storedCurrenciesString) {
      this.calculateTotals(this.assetData);
    }
  }

  calculateAssetData(data:any) {
    let currency = data;
    console.log(currency);
    console.log(this.fixerEndpoint);
    this.getFiatRate(this.fixerEndpoint).subscribe((res: any) => {
      this.FiatValues.push(res.rates);
      for (const [key, value] of Object.entries(this.FiatValues[0])) {
        this.interimValues.push(1 / value);
      }
      this.exchange = this.interimValues[1] / this.interimValues[0];
      this.getCryptoData(this.endpoint, currency.asset_abbrev).subscribe((res:any) => {
        if(res.data) {
          currency.asset_name = res.data.slug;
          currency.price_usd = res.data.market_data.price_usd;
          currency.price_gbp = res.data.market_data.price_usd / this.exchange;
          currency.value_gbp = currency.price_gbp * currency.asset_held;
          currency.value_usd = currency.price_usd * currency.asset_held;
          currency.profit_gbp = currency.value_gbp - currency.asset_invested;
          this.assetData = this.assetData || [];
          this.assetData.push(currency);
          this.assetData.sort((a:any, b:any) => parseFloat(a.asset_sort_order) - parseFloat(b.asset_sort_order));
          let tempCurrency = JSON.stringify(this.assetData);
          localStorage.setItem('assetData', tempCurrency);
          this.calculateTotals(this.assetData);
          this.resetEditForm();
          this.resetAddForm();
        } else {
          console.log("rate limit exceeded");
        }
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
        this.asset_list.push({'symbol': asset.symbol, 'name': asset.name});
        return this.asset_list;
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

  onClickSubmit(data:any) {
    this.calculateAssetData(data);
 }

  calculateTotals(assets:any) {
    this.totalValueUsd = 0;
    this.totalValueGbp = 0;
    this.totalProfit = 0;
    assets.forEach((asset:any) => {
      this.totalValueUsd = this.totalValueUsd + asset.value_usd;
      this.totalValueGbp = this.totalValueGbp + asset.value_gbp;
      this.totalProfit = this.totalProfit + asset.profit_gbp;
      localStorage.setItem('previousProfit', this.totalProfit);
      this.calculateProfitDifference();
    })
  }

  setEditAssetFormData(assetData:any, event:any) {
    this.editAssetformdata.controls['asset_held'].setValue(assetData.asset_held);
    this.editAssetformdata.controls['asset_invested'].setValue(assetData.asset_invested);
    this.editAssetformdata.controls['asset_wallet'].setValue(assetData.asset_wallet);
    this.editAssetformdata.controls['asset_abbrev'].setValue(assetData.asset_abbrev);
    this.editAssetformdata.controls['asset_name'].setValue(assetData.asset_name);
    this.editAssetformdata.controls['asset_sort_order'].setValue(assetData.asset_sort_order);
    this.flipCard(event);
  }

  cancelEditAssetFormData(event:any) {
    this.flipCardBack (event);
  }

  updateAsset(data:any) {
    let tempAssetData:any = []
    tempAssetData.push(JSON.parse(this.storedCurrenciesString));
    let updatedAssetIndex = this.assetData.findIndex(
      (asset:any) => asset.asset_abbrev === data.asset_abbrev
    )
    this.assetData.splice(updatedAssetIndex, 1);
    let tempCurrency = JSON.stringify(this.assetData);
    localStorage.setItem('assetData', tempCurrency);
    this.calculateAssetData(data);
    this.refreshDate(); 
  }

  deleteAsset(data:any) {
    let tempAssetData:any = []
    tempAssetData.push(JSON.parse(this.storedCurrenciesString));
    let updatedAssetIndex = this.assetData.findIndex(
      (asset:any) => asset.asset_abbrev === data.asset_abbrev
    )
    this.assetData.splice(updatedAssetIndex, 1);
    let tempCurrency = JSON.stringify(this.assetData);
    localStorage.setItem('assetData', tempCurrency);
    this.resetData();
    this.refreshDate();
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
