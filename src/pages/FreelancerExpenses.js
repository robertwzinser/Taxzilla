import { ref, remove, onValue, equalTo, query, orderByChild, get, update } from "firebase/database";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";

const FreelancerExpenses =()=>{
  const [expenseData, setExpenseData] = useState([]);
  const [total, setTotal] = useState(0)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log ("test")
      if (user) {
        const userId = user.uid;
        const fetchdata = async () => {
        const fetchExpenses = async () => {
          const expenseRef = ref(db, "expenseCollection")
          const q = query(expenseRef, orderByChild ("employer"), equalTo(userId))
          let data = {}
          onValue(q, (snapshot) => {
           data = snapshot.val()
          });
        if(!data)
          return 
          const expenseArray = Object.entries (data).map (([key, value]) => ({
            id: key, ...value
          }))
          return expenseArray
        }
       const data = await fetchExpenses ()
       if (!data)
        return
      const acceptedexpenses = data.filter((expense)=>expense.accepted === true)
      console.log (acceptedexpenses)
      setTotal(acceptedexpenses.reduce((cost, person) => cost + parseFloat(person.expense), 0))
       const filterData = data.filter((expense)=> expense.accepted === undefined )
       setExpenseData(filterData)
       console.log(data)
      }
      fetchdata()
      } else {

      }
    });
    
   
    
    return () => unsubscribe(); // Clean up the subscription
  }, []);

  const expensedecision = async (id, decision)=>{
    const expenseRef = ref(db, `expenseCollection/${id}`)
    const updatedexpense = {
      accepted: decision
    }
    await update(expenseRef, updatedexpense)
    }
    console.log(expenseData)
  return(
    <div>
    <h1> Expenses </h1>
    <h2>Total Accepted Cost: ${total}</h2>
      {expenseData.length !== 0 ? expenseData.map((expense)=>(
        <div className = "expenselist">    
          <h3> Freelancer: {expense.fullname} </h3>
          {/* <label> Freelancer: {expense.userID} </label> */}
          <label>Category: {expense.category}</label>
          <label>Cost: {expense.expense} </label>
          <label>Email: {expense.email}</label>
          <label>Image: <a href = {expense.downloadURL} target= "_blank"> {expense.downloadURL}</a> </label>
          {expense.accepted === undefined && <div> 
          <button onClick={(e)=> expensedecision(expense.id, true)}> Accept Expense </button>
          <button onClick={(e)=> expensedecision(expense.id, false)}> Reject Expense </button>
            </div>}
          
           </div>
      )):
      <h3>No Current Expenses.</h3>
      }
      </div>
  )
}
export default FreelancerExpenses