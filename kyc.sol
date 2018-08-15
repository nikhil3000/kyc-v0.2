pragma solidity ^0.4.0;
contract kyc {
     address owner;
     
     
constructor () public {
        owner = msg.sender;
    }
    
    string id;
    struct data
    {
        string signature;
        string pkuser;
    }
    
    event custId(string id,uint256 index);
    
    
    data[] public customer;
    mapping (string => uint) id_to_custdata; 
    
    function addCustomer(string _id, string _signature, string _pkuser)  public 
    {
        id=_id;
        uint index = customer.push(data(_signature, _pkuser));
        id_to_custdata[id] = index-1; 
        emit custId(id,index);
        // }
        // else
        // {
        //   emit custId("0",0);
        // }
    }
    
    function viewSignature(string _id) public view returns (string) 
    {
        uint i= id_to_custdata[_id];
        data storage temp=customer[i];
        return (temp.signature);
        
    }
    
     function viewKey(string _id) public view returns (string) 
    {
        uint i= id_to_custdata[_id];
        data storage temp=customer[i];
        return (temp.pkuser);
        
    }
    
    function updateData(string _id, string _signature) public
    {
         uint i= id_to_custdata[_id];
         data storage c=customer[i];
         c.signature=_signature;
         id_to_custdata[id] = i;
         

         
     }
    
    function kill() public 
     { 
         if (msg.sender == owner) 
         selfdestruct(owner);
     }

} 
