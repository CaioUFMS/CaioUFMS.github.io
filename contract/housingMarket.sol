// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract HousingMarket {

    uint internal propertiesLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    //Define um imóvel, propriedade número de deisponíveis existe para apartamentos e deve ser 1 para casas
    struct Property {
        address payable owner;
        string propertyAddress;
        string image;
        string description;
        string city;
        uint noAvailable;
        uint price;
    }

    //Define o array para armazenar os imóveis
    mapping (uint => Property) internal properties;

    //Função que escreve um novo imóvel no array
    function writeProperty(
        string memory _propertyAddress,
        string memory _image,
        string memory _description, 
        string memory _city,
        uint _noAvailable,
        uint _price
    ) public {
        properties[propertiesLength] = Property(
            payable(msg.sender),
            _propertyAddress,
            _image,
            _description,
            _city,
            _noAvailable,
            _price
        );
        propertiesLength++;
    }

    //Função que le e retorna um imóvel
    function readProperty(uint _index) public view returns (
        address payable,
        string memory, 
        string memory, 
        string memory, 
        string memory, 
        uint, 
        uint
    ) {
        return (
            properties[_index].owner,
            properties[_index].propertyAddress, 
            properties[_index].image, 
            properties[_index].description, 
            properties[_index].city,
            properties[_index].noAvailable,
            properties[_index].price
        );
    }

    //Função para realizar a compra de um imóvel
    function buyProperty(uint _index) public payable  {
        if(properties[_index].noAvailable > 0){
            require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                properties[_index].owner,
                properties[_index].price
            ),
            "Transfer failed."
            );
            properties[_index].noAvailable--;
        }   
    }

    function getPropertiesLength() public view returns (uint) {
            return (propertiesLength);
    }
}