import Web3 from "web3"
import { newKitFromWeb3 } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import houseMarketAbi from "../contract/housingMarket.abi.json"
import erc20Abi from "../contract/erc20.abi.json"

const ERC20_DECIMALS = 18
const HMContractAddress = "0xc92d20f36CcbcCDCEC80139717A529ff693C114E"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit
let contract
let properties = []

//conecta à carteira ativa através da extensão CeloExtensionWallet e pede sua instalação caso não exista
const connectCeloWallet = async function () {
  if (window.celo) {
    notification("⚠️ Por favor aprove este DApp para usá-lo.")
    try {
      await window.celo.enable()
      notificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(houseMarketAbi, HMContractAddress)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  } else {
    notification("⚠️ Por favor, instale a extensão CeloExtensionWallet.")
  }
}

//Aprova uma allowance para o contrato
async function approve(_price) {
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)

  const result = await cUSDContract.methods
    .approve(HMContractAddress, _price)
    .send({ from: kit.defaultAccount })
  return result
}

//Obtém o saldo do usuário atual
const getBalance = async function () {
  const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
  const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
  document.querySelector("#balance").textContent = cUSDBalance
}

//Recupera todos os imóveis do contrato
const getProperties = async function() {
  const _propertiesLength = await contract.methods.getPropertiesLength().call()
  const _properties = []
  for (let i = 0; i < _propertiesLength; i++) {
    let _property = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readProperty(i).call()
      resolve({
        index: i,
        owner: p[0],
        propertyAddress: p[1],
        image: p[2],
        description: p[3],
        city: p[4],
        noAvailable: p[5],
        price: new BigNumber(p[6]),
      })
    })
    _properties.push(_property)
  }
  properties = await Promise.all(_properties)
  renderProperties()
}

//Renderiza os imóveis cujo usuário atual é o dono ou que estejam ainda disponíveis para venda
function renderProperties() {
  document.getElementById("houseMarket").innerHTML = ""
  properties.forEach((_property) => {
    if(_property.noAvailable > 0 || _property.owner == kit.defaultAccount){
      const newDiv = document.createElement("div")
      newDiv.className = "col-md-4"
      newDiv.innerHTML = propertyTemplate(_property)
      document.getElementById("houseMarket").appendChild(newDiv)
    }
  })
}

//Templates utilizados para renderizar os cards dos imóveis
function propertyTemplate(_property) {
  if(_property.owner == kit.defaultAccount){
    //template utilizado quando o usuário atual é dono do imóvel a ser renderizado
    return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_property.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_property.noAvailable} Disponíveis
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_property.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_property.propertyAddress}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_property.description}             
        </p>
        <p class="card-text mt-4">
          <span> Preço: ${_property.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)}</span>
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_property.city}</span>
        </p>
      </div>
    </div>
  `
  }else {
    //template utilizado quando o usuário atual não é dono do imóvel a ser renderizado
    return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_property.image}" alt="...">
      <div class="position-absolute top-0 end-0 bg-warning mt-4 px-2 py-1 rounded-start">
        ${_property.noAvailable} Disponíveis
      </div>
      <div class="card-body text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_property.owner)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_property.propertyAddress}</h2>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_property.description}             
        </p>
        <p class="card-text mt-4">
          <i class="bi bi-geo-alt-fill"></i>
          <span>${_property.city}</span>
        </p>
        <div class="d-grid gap-2">
          <a class="btn btn-lg btn-outline-dark buyBtn fs-6 p-3" id=${
            _property.index
          }>
            Comprar por ${_property.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD
          </a>
        </div>
      </div>
    </div>
  `
  }
}

//Função para criação do identicon
function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

//Funções para settar ou desativar notificações
function notification(_text) {
  document.querySelector(".alert").style.display = "block"
  document.querySelector("#notification").textContent = _text
}

function notificationOff() {
  document.querySelector(".alert").style.display = "none"
}

//Event Listener para carregar todos os elementos para a tela
window.addEventListener("load", async () => {
  notification("⌛ Loading...")
  await connectCeloWallet()
  await getBalance()
  await getProperties()
  notificationOff()
});

//Atribuindo métodos aos eventos de clique pelo DOM

//Salvando um imóvel quando adicionado pelo modal
document
  .querySelector("#newPropertyBtn")
  .addEventListener("click", async (e) => {
    const params = [
      document.getElementById("newPropertyAddress").value,
      document.getElementById("newImgUrl").value,
      document.getElementById("newPropertyDescription").value,
      document.getElementById("newCity").value,
      document.getElementById("newNumberAvailable").value,
      new BigNumber(document.getElementById("newPrice").value)
      .shiftedBy(ERC20_DECIMALS)
      .toString()
    ]
    notification(`⌛ Adicionando o imóvel em "${params[0]}"...`)
    try {
      const result = await contract.methods
        .writeProperty(...params)
        .send({ from: kit.defaultAccount })
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`🎉 Você adicionou com sucesso o imóvel em "${params[0]}".`)
    getProperties()
})

//Realizando a venda de um imóvel quando o usuário clica em comprar
document.querySelector("#houseMarket").addEventListener("click", async (e) => {
  if (e.target.className.includes("buyBtn")) {
    const index = e.target.id
    notification("⌛ Esperando aprovação do Pagamento...")
    try {
      await approve(properties[index].price)
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
    notification(`⌛ Esperando pagando para o imóvel em "${properties[index].propertyAddress}"...`)
    try {
      const result = await contract.methods
        .buyProperty(index)
        .send({ from: kit.defaultAccount })
      notification(`🎉 Você comprou com sucesso o imóvel em "${properties[index].propertyAddress}".`)
      getProperties()
      getBalance()
    } catch (error) {
      notification(`⚠️ ${error}.`)
    }
  }
})  