import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { getDatabase, ref, get, set, push, remove } from "firebase/database";
import "./Profile.css";

const Profile = () => {
  const { uid } = useParams(); 
  const [profileData, setProfileData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    profession: "",
    address: "",
    bio: "",
    rating: 0,
  });
  const [originalData, setOriginalData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [states, setStates] = useState({});
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 0, comment: "" });

  useEffect(() => {
    const fetchData = async () => {
      const db = getDatabase();
      const userRef = ref(db, `users/${uid}`);
      const statesRef = ref(db, "statesCollection");
      const reviewsRef = ref(db, `reviews/${uid}`);

      const [userSnap, statesSnap, reviewsSnap] = await Promise.all([
        get(userRef),
        get(statesRef),
        get(reviewsRef),
      ]);

      if (userSnap.exists()) {
        const data = userSnap.val();
        setProfileData(data);
        setOriginalData(data);
      }

      if (statesSnap.exists()) {
        setStates(statesSnap.val());
      }

      if (reviewsSnap.exists()) {
        const reviewsData = Object.entries(reviewsSnap.val()).map(
          async ([id, review]) => {
            const reviewerRef = ref(db, `users/${review.reviewerId}`);
            const reviewerSnap = await get(reviewerRef);
            const reviewerName = reviewerSnap.exists()
              ? `${reviewerSnap.val().firstname} ${reviewerSnap.val().lastname}`
              : "Unknown";

            return {
              id,
              ...review,
              reviewerName,
            };
          }
        );

        const resolvedReviews = await Promise.all(reviewsData);
        setReviews(resolvedReviews);

        const avgRating =
          resolvedReviews.reduce((sum, r) => sum + r.rating, 0) /
          resolvedReviews.length;
        setProfileData((prev) => ({ ...prev, rating: avgRating.toFixed(1) }));
      }

      setLoading(false);
    };

    fetchData();
  }, [uid]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setProfileData((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <>
        {"★".repeat(fullStars)}
        {halfStar && "☆"}
        {"☆".repeat(emptyStars)}
      </>
    );
  };

  const handleDeleteReview = async (reviewId) => {
    const db = getDatabase();
    const reviewRef = ref(db, `reviews/${uid}/${reviewId}`);
    try {
      await remove(reviewRef);
      const updatedReviews = reviews.filter((review) => review.id !== reviewId);
      setReviews(updatedReviews);
      const avgRating =
        updatedReviews.reduce((sum, r) => sum + r.rating, 0) /
        (updatedReviews.length || 1);
      setProfileData((prev) => ({ ...prev, rating: avgRating.toFixed(1) }));
    } catch (error) {
      console.error("Error deleting review:", error);
    }
  };

  const handleSave = async () => {
    if (auth.currentUser?.uid === uid) {
      const db = getDatabase();
      const userRef = ref(db, `users/${uid}`);
      try {
        await set(userRef, profileData);
        setMessage("Profile updated successfully.");
        setIsEditing(false);
        setOriginalData(profileData);
      } catch (error) {
        console.error("Error updating profile:", error);
        setMessage("Failed to update profile.");
      }
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleReviewSubmit = async () => {
    if (auth.currentUser?.uid === uid) return; // Prevent self-review
    const db = getDatabase();
    const reviewRef = push(ref(db, `reviews/${uid}`));

    try {
      // Capture review data
      const timestamp = Date.now();
      const reviewData = {
        ...newReview,
        reviewerId: auth.currentUser?.uid,
        timestamp,
      };

      // Save the review to the database
      await set(reviewRef, reviewData);

      // Fetch the reviewer's name
      const reviewerRef = ref(db, `users/${auth.currentUser?.uid}`);
      const reviewerSnap = await get(reviewerRef);
      const reviewerName = reviewerSnap.exists()
        ? `${reviewerSnap.val().firstname} ${reviewerSnap.val().lastname}`
        : "Unknown";

      // Add the new review with reviewerName to the state
      setReviews([
        ...reviews,
        {
          ...reviewData,
          id: reviewRef.key,
          reviewerName,
        },
      ]);

      // Reset the review form
      setNewReview({ rating: 0, comment: "" });

      // Update the average rating
      const avgRating =
        [...reviews, { ...reviewData, reviewerName }].reduce(
          (sum, r) => sum + r.rating,
          0
        ) /
        (reviews.length + 1);
      setProfileData((prev) => ({ ...prev, rating: avgRating.toFixed(1) }));
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  const isOwnProfile = auth.currentUser?.uid === uid;

  return (
    <div className="profile-container">
      {isOwnProfile ? (
        <div>
          <h1>My Profile</h1>
          {message && <p className="message">{message}</p>}

          <div className="profile-info">
            <label htmlFor="firstname">First Name</label>
            <input
              type="text"
              id="firstname"
              value={profileData.firstname}
              onChange={handleChange}
              disabled={!isEditing}
            />

            <label htmlFor="lastname">Last Name</label>
            <input
              type="text"
              id="lastname"
              value={profileData.lastname}
              onChange={handleChange}
              disabled={!isEditing}
            />

            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={profileData.email} disabled />

            <label htmlFor="profession">Profession</label>
            <input
              type="text"
              id="profession"
              value={profileData.profession}
              onChange={handleChange}
              disabled={!isEditing}
            />

            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              value={profileData.address}
              onChange={handleChange}
              disabled={!isEditing}
            />

            {profileData.role === "Freelancer" && (
              <>
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={profileData.state}
                  onChange={handleChange}
                  disabled={!isEditing}
                >
                  {Object.entries(states).map(([state, data]) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="bio">Bio</label>
            <input
              type="text"
              id="bio"
              value={profileData.bio}
              onChange={handleChange}
              disabled={!isEditing}
            />

            <label htmlFor="rating">Rating</label>
            <input
              type="text"
              id="rating"
              value={
                reviews.length === 0
                  ? "No Reviews"
                  : `${(
                      reviews.reduce((sum, r) => sum + r.rating, 0) /
                      reviews.length
                    ).toFixed(0)} ★`
              }
              disabled 
              className="dynamic-rating"
            />
          </div>

          <div className="profile-actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="save-btn">
                  Save Changes
                </button>
                <button onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-btn">
                Edit Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="profile-container">
          <div className="profile-header">
            <h1 className="profile-name">
              {profileData.firstname} {profileData.lastname}'s Profile
            </h1>
            <p className="profile-rating">
              <span className="profile-rating-label">Rating:</span>{" "}
              <span className="profile-rating-value">
                {reviews.length === 0 ? (
                  "No Reviews"
                ) : (
                  <span className="star-display">
                    {renderStars(profileData.rating)}
                  </span>
                )}
              </span>
            </p>
          </div>

          <div className="profile-details">
            <p>
              <strong>Email:</strong> {profileData.email}
            </p>
            <p>
              <strong>Profession:</strong> {profileData.profession}
            </p>
            <p>
              <strong>Address:</strong> {profileData.address}
            </p>
            {profileData.bio && (
              <p>
                <strong>Bio:</strong> {profileData.bio}
              </p>
            )}
          </div>

          <div className="reviews-section">
            <h2 className="reviews-heading">Leave a Review</h2>
            <div className="review-form">
              <label htmlFor="review-rating" className="review-label">
                Rating:{" "}
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${
                      newReview.rating >= star ? "selected" : ""
                    }`}
                    onClick={() =>
                      setNewReview((prev) => ({ ...prev, rating: star }))
                    }
                  >
                    ★
                  </span>
                ))}
                <div className="star-selector"></div>
              </label>

              <textarea
                id="review-comment"
                className="review-textarea"
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview({ ...newReview, comment: e.target.value })
                }
                placeholder="Write your review here..."
              ></textarea>
              <button
                className="review-submit-btn"
                onClick={handleReviewSubmit}
              >
                Submit Review
              </button>
            </div>

            <h2 className="reviews-heading">Reviews</h2>
            <ul className="reviews-list">
              {reviews.length > 0 ? (
                reviews.map((review, idx) => (
                  <li key={idx} className="review-item">
                    <div className="review-rating">
                      <strong>Rating:</strong>{" "}
                      <span className="star-display">
                        {renderStars(review.rating)}
                      </span>
                    </div>
                    <div className="review-comment">
                      <strong>Comment:</strong> {review.comment}
                    </div>
                    <div className="review-meta">
                      <span>
                        <strong>Reviewer:</strong>{" "}
                        {review.reviewerName || "Unknown"}
                      </span>
                    </div>

                    <div className="review-meta">
                      <span>
                        <strong>Reviewed on:</strong>{" "}
                        {new Date(review.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {auth.currentUser?.uid === review.reviewerId && (
                      <button
                        className="review-delete-btn"
                        onClick={() => handleDeleteReview(review.id)}
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))
              ) : (
                <p className="no-reviews">
                  No reviews yet. Be the first to leave one!
                </p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
