import React, { useState, useEffect } from "react";
import { ref, get, set, push } from "firebase/database";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import "./JobBoard.css";

const FreelancerJobBoard = ({ jobs, setMessages }) => {
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [blockedByEmployers, setBlockedByEmployers] = useState([]); // Employers that blocked the freelancer
  const [blockedEmployers, setBlockedEmployers] = useState([]); // Employers blocked by the freelancer
  const navigate = useNavigate();

  // Fetch blocked employers and blocked-by-employers data
  useEffect(() => {
    const fetchBlockedData = async () => {
      const freelancerId = auth.currentUser?.uid;
      if (!freelancerId) return;

      const freelancerRef = ref(db, `users/${freelancerId}`);
      const snapshot = await get(freelancerRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();

        // Employers that blocked the freelancer
        const blockedBy = Object.entries(userData.blockedBy || {})
          .filter(([_, value]) => value.blocked)
          .map(([key]) => key);

        // Employers blocked by the freelancer
        const blocked = Object.entries(userData.blockedUsers || {})
          .filter(([_, value]) => value.blocked)
          .map(([key]) => key);

        setBlockedByEmployers(blockedBy);
        setBlockedEmployers(blocked);
      }
    };

    fetchBlockedData();
  }, []);

  // Filter jobs dynamically based on block relationships
  useEffect(() => {
    const filterJobs = () => {
      const filtered = jobs.filter(
        ([_, job]) =>
          !blockedByEmployers.includes(job.employerId) && // Employers that blocked the freelancer
          !blockedEmployers.includes(job.employerId)    // Employers blocked by the freelancer
      );
      setFilteredJobs(filtered);
    };

    if (jobs.length > 0 && (blockedByEmployers.length >= 0 || blockedEmployers.length >= 0)) {
      filterJobs();
    }
  }, [jobs, blockedByEmployers, blockedEmployers]);

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleRequestJob = async (jobId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const jobRef = ref(db, `jobs/${jobId}`);
    const requestRef = ref(db, `jobs/${jobId}/requests/${userId}`);
    const freelancerRef = ref(db, `users/${userId}`);
    const userJobs = ref (db, `users/${userId}/jobs`)

    try {
      const freelancerData = (await get(freelancerRef)).val();
      const freelancerName = `${freelancerData.firstname} ${freelancerData.lastname}`;
      const userjobdata = await get(userJobs)
      const jobData = (await get(jobRef)).val();
      if (userjobdata.exists()){
        const data = userjobdata.val()
        for(const [id, job] of Object.entries(data) ){
          const currentStartDate= new Date (job.startDate).getTime()
          const currentEndDate= new Date (job.endDate).getTime()
          const newStartDate= new Date (jobData.startDate).getTime()
          const newEndDate= new Date (jobData.endDate).getTime()
          if(newStartDate < currentEndDate && newEndDate > currentStartDate){
            alert("Cannot request Job")
            return

          }
        }
      }

      await set(requestRef, {
        status: "requested",
        freelancerId: userId,
        freelancerName,
      });

     
      const employerId = jobData.employerId;
      const notificationRef = ref(db, `notifications/${employerId}`);
      await push(notificationRef, {
        type: "job-request",
        message: `New job request from ${freelancerName}.`,
        fromName: freelancerName,
        freelancerId: userId,
        jobId,
        timestamp: Date.now(),
        redirectUrl: "/job-board",
      });

      alert("Job request sent successfully.");
    } catch (error) {
      console.error("Error sending job request:", error.message);
      alert("Error sending job request. Please try again.");
    }
  };

  return (
    <div>
      <h1>Available Jobs</h1>
      <div className="job-list">
        {filteredJobs.length > 0 ? (
          filteredJobs.map(([id, job]) => {
            const hasRequested =
              job.requests &&
              job.requests[auth.currentUser?.uid] &&
              job.requests[auth.currentUser?.uid].status === "requested";
            const isAccepted = job.status === "accepted";

            return (
              <div className="job-item" key={id}>
                <h2>{job.title}</h2>
                <p>
                  <strong>Posted by: {job.employerName || "Unknown"}</strong>
                </p>
                <p>{job.description}</p>
                <p>Hourly Rate: ${job.payment}</p>
                <p>
                  Starts: {job.startDate} and Ends: {job.endDate}
                </p>
                <p>
                  Status:{" "}
                  {isAccepted
                    ? "Accepted"
                    : hasRequested
                    ? "Requested"
                    : "Open"}
                </p>
                <button onClick={() => handleViewProfile(job.employerId)}>
                  View Employer Profile
                </button>

                {!isAccepted && !hasRequested && (
                  <button
                    style={{ backgroundColor: "#295442" }}
                    onClick={() => handleRequestJob(id)}
                  >
                    Request Job
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p>No jobs available at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default FreelancerJobBoard;
