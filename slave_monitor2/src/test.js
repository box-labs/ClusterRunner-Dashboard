import * as d3 from "d3";

export default class {

  constructor(rootElement, eur_usd_coeff) {
    this.rootElement = rootElement;
    this.eur_usd_coeff = eur_usd_coeff;
    this.EUR = 0;
    this.USD = 0;
  }

  render() {
    // detach event listeners
    // $('button').off('click');

    // define html
    let html = `
      <table>
        <tr>
          <td>EUR</td>
          <td>&nbsp;</td>
          <td>USD</td>
        </tr>
        <tr>
          <td><input id="EUR" value="${this.EUR}"/></td>
          <td>
            <button id="convertEURtoUSD">>>></button><br>
            <button id="convertUSDtoEUR"><<<</button>
          </td>
          <td><input id="USD" value="${this.USD}" /></td>
       </tr>
      </table>
    `;

    rootElement.innerHTML = html;

    // attach event listeners
    // $('#convertEURtoUSD').on('click', function() {
    //   this.convertEURtoUSD()
    // });
    // $('#convertUSDtoEUR').on('click', () => {
    //   this.convertUSDtoEUR()
    // });
  }

  // convertEURtoUSD() {
  //   this.EUR = $('#EUR').val();
  //   this.USD = this.EUR * this.eur_usd_coeff;
  //   this.render();
  // }
  //
  // convertUSDtoEUR() {
  //   this.USD = $('#USD').val();
  //   this.EUR = this.USD / this.eur_usd_coeff;
  //   this.render();
  // }

};
