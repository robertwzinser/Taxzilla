import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../../firebase";
import Chart from "chart.js/auto";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  MenuItem,
  Select,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./FreelancerDetail.css";

const FreelancerDetail = () => {
  const { freelancerId } = useParams();
  const [freelancer, setFreelancer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [incomeData, setIncomeData] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [chartInstance, setChartInstance] = useState(null);
  const [viewRange, setViewRange] = useState("monthly");

  useEffect(() => {
    const freelancerRef = ref(db, `users/${freelancerId}`);
    onValue(freelancerRef, (snapshot) => {
      const data = snapshot.val();
      setFreelancer({
        fullname: `${data.firstname} ${data.lastname}`,
        email: data.email,
      });
    });
  }, [freelancerId]);

  useEffect(() => {
    const incomeRef = ref(db, `users/${freelancerId}/linkedEmployers`);
    onValue(incomeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const employerIncome = Object.entries(data).reduce(
          (acc, [employerId, employerData]) => {
            if (employerData.incomeEntries) {
              acc.push(...Object.values(employerData.incomeEntries));
            }
            return acc;
          },
          []
        );
        setIncomeData(employerIncome);
      } else {
        setIncomeData([]);
      }
    });
  }, [freelancerId]);

  useEffect(() => {
    const jobsRef = ref(db, `jobs`);
    onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const jobsList = Object.entries(data)
          .filter(([jobId, job]) => job.freelancerId === freelancerId)
          .map(([jobId, job]) => ({ ...job, jobId }));
        setJobs(jobsList);
      } else {
        setJobs([]);
      }
    });
  }, [freelancerId]);

  useEffect(() => {
    const expensesRef = ref(db, "expenseCollection");
    onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const freelancerExpenses = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .filter((expense) => expense.userID === freelancerId);

        setExpenses(freelancerExpenses);
        const total = freelancerExpenses
          .filter((expense) => expense.accepted !== false)
          .reduce((sum, expense) => sum + parseFloat(expense.expense), 0);
        setTotalExpenses(total);
      } else {
        setExpenses([]);
        setTotalExpenses(0);
      }
    });
  }, [freelancerId]);

  const handleExpenseDecision = async (expenseId, decision) => {
    const expenseRef = ref(db, `expenseCollection/${expenseId}`);
    try {
      await update(expenseRef, { accepted: decision });
      alert(`Expense ${decision ? "accepted" : "rejected"} successfully!`);
    } catch (error) {
      console.error("Error updating expense:", error.message);
      alert("Error updating expense. Please try again.");
    }
  };

  const aggregateIncomeByDate = (entries) => {
    const aggregated = {};
    entries.forEach((entry) => {
      if (aggregated[entry.date]) {
        aggregated[entry.date].amount += entry.amount;
      } else {
        aggregated[entry.date] = { amount: entry.amount };
      }
    });
    return Object.entries(aggregated).map(([date, { amount }]) => ({
      date,
      amount,
    }));
  };

  const filterIncomeByRange = (entries) => {
    const now = new Date();
    return entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (viewRange === "weekly") {
        return entryDate >= new Date(now.setDate(now.getDate() - 7));
      } else if (viewRange === "monthly") {
        return entryDate >= new Date(now.setMonth(now.getMonth() - 1));
      } else if (viewRange === "quarterly") {
        return entryDate >= new Date(now.setMonth(now.getMonth() - 3));
      } else if (viewRange === "annually") {
        return entryDate >= new Date(now.setFullYear(now.getFullYear() - 1));
      }
      return true;
    });
  };

  const createIncomeChart = () => {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = document.getElementById("freelancerIncomeChart").getContext("2d");
    const filteredData = filterIncomeByRange(incomeData);
    const aggregatedData = aggregateIncomeByDate(filteredData);
    const chartData = {
      labels: aggregatedData.map((entry) => entry.date),
      datasets: [
        {
          label: "Income",
          data: aggregatedData.map((entry) => entry.amount),
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
          tension: 0.4,
        },
      ],
    };

    const newChartInstance = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Income: $${context.raw}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    setChartInstance(newChartInstance);
  };

  useEffect(() => {
    if (incomeData.length > 0) {
      createIncomeChart();
    }
  }, [incomeData, viewRange]);

  const calculateOverallIncome = () => {
    const filteredData = filterIncomeByRange(incomeData);
    return filteredData.reduce((acc, curr) => acc + curr.amount, 0);
  };

  return (
    <div className="freelancer-detail">
      {freelancer && (
        <>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" component="h2">
              {freelancer.fullname}
            </Typography>
            <Typography variant="body1">Email: {freelancer.email}</Typography>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h3">
              Overall Income
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body2">View Range:</Typography>
              <Select
                value={viewRange}
                onChange={(e) => setViewRange(e.target.value)}
                sx={{
                  mb: 2,
                  color: '#ffffff',
                  backgroundColor: '#333333',
                  '.MuiOutlinedInput-notchedOutline': {
                    borderColor: '#555555',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#888888',
                  },
                  '.MuiSvgIcon-root': {
                    color: '#ffffff',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#333333',
                      color: '#ffffff',
                    },
                  },
                }}
              >
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annually">Annually</MenuItem>
              </Select>
              <Typography variant="h6">
                Total Income: ${calculateOverallIncome().toFixed(2)}
              </Typography>
            </Box>
            <canvas id="freelancerIncomeChart"></canvas>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
              Jobs Worked
            </Typography>
            {jobs.length === 0 ? (
              <Typography>No jobs completed by this freelancer yet.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {jobs.map((job, index) => (
                  <Accordion key={index} sx={{ backgroundColor: "#1e1e1e", color: "white" }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}>
                      <Typography variant="h6">{job.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">{job.description}</Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        Payment to Date: $
                        {incomeData
                          .filter((entry) => entry.jobId === job.jobId)
                          .reduce((acc, entry) => acc + entry.amount, 0)}
                      </Typography>
                      <Typography variant="body2" color="primary">
                        Status: {job.status}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
              Freelancer Reimbursements (Total: ${totalExpenses.toFixed(2)})
            </Typography>
            {expenses.length > 0 ? (
              expenses.map((expense, index) => (
                <Accordion key={index} sx={{ backgroundColor: "#1e1e1e", color: "white" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}>
                    <Typography>{expense.category}: ${expense.expense}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" sx={{ mb: 1 }}>Date: {expense.date}</Typography>
                    <Typography variant="body2">
                      <a href={expense.downloadURL} target="_blank" rel="noopener noreferrer">View Receipt</a>
                    </Typography>
                    {expense.accepted === undefined ? (
                      <Box sx={{ mt: 2 }}>
                        <Button variant="contained" color="success" onClick={() => handleExpenseDecision(expense.id, true)} sx={{ mr: 1 }}>
                          Accept
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => handleExpenseDecision(expense.id, false)}>
                          Reject
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 1 }} color={expense.accepted ? "success.main" : "error.main"}>
                        {expense.accepted ? "Accepted" : "Rejected"}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            ) : (
              <Typography>No expenses submitted by this freelancer.</Typography>
            )}
          </Box>

          <Box sx={{ mt: 4 }}>
            <Button variant="contained" color="primary" component={Link} to={`/add-income/${freelancerId}`}>
              Add Income
            </Button>
          </Box>
        </>
      )}
    </div>
  );
};

export default FreelancerDetail;
