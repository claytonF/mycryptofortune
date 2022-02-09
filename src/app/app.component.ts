import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { FormGroup, FormControl } from '@angular/forms';
import { environment } from './../environments/environment';
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
  asset_abbrev: any;
  asset_name: any;
  asset_held: any;
  asset_wallet: any;
  asset_invested: any;
  storedCurrenciesString: any;
  asset_list: any = [];

  endpoint: any = 'https://data.messari.io/api/v1/assets';
  storedCurrencies: any = [];
  fixerEndpoint: string = `http://data.fixer.io/api/latest?access_key=${environment.access_key}&format=1&symbols=USD,GBP`

  constructor(
    private http: HttpClient,
    ) { }

    ngOnInit() {
      this.getCryptoList(this.endpoint);
      this.refreshDate();
      this.formdata = new FormGroup({
        asset_abbrev: new FormControl(),
        asset_name: new FormControl(),
        asset_held: new FormControl(),
        asset_wallet: new FormControl(),
        asset_invested: new FormControl()
     });
    }
  
  
  refreshDate() {
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
    console.log(this.fixerEndpoint);
    this.getFiatRate(this.fixerEndpoint).subscribe((res: any) => {
      this.FiatValues.push(res.rates);
      for (const [key, value] of Object.entries(this.FiatValues[0])) {
        this.interimValues.push(1 / value);
      }
      this.exchange = this.interimValues[1] / this.interimValues[0];
        this.getCryptoData(this.endpoint, currency.asset_abbrev).subscribe((res:any) => {
          if(res.data) {
            currency.price_usd = res.data.market_data.price_usd;
            currency.price_gbp = res.data.market_data.price_usd / this.exchange;
            currency.value_gbp = currency.price_gbp * currency.asset_held;
            currency.value_usd = currency.price_usd * currency.asset_held;
            currency.profit_gbp = currency.value_gbp - currency.asset_invested;
            console.log(currency);
            this.assetData = this.assetData || [];
            this.assetData.push(currency);
            let tempCurrency = JSON.stringify(this.assetData);
            localStorage.setItem('assetData', tempCurrency);
            this.calculateTotals(this.assetData);
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

      })
    });
  }
  getFiatRate(endpoint:any) {
    return this.http.get(endpoint);
  }

  assetName(value: string) {
    console.log(value);

  }

  resetData() {
    this.assetData = [];
    this.totalValueUsd = 0;
    this.totalValueGbp = 0;
    this.totalProfit = 0;
  }

  onClickSubmit(data:any) {
    console.log(data);
    this.calculateAssetData(data);
 }

  calculateTotals(assets:any) {
    assets.forEach((asset:any) => {
      console.log(asset);
      this.totalValueUsd = this.totalValueUsd + asset.value_usd;
      this.totalValueGbp = this.totalValueGbp + asset.value_gbp;
      this.totalProfit = this.totalProfit + asset.profit_gbp;
      console.log(this.totalProfit);

    })
  }
}
