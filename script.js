let currentPage = 1;
let lastQuery = "";
let currentFilter = "popular";

async function fetchRepos(page=1) {
  const query = sanitizeQuery(document.getElementById("searchInput").value);
  const sort = document.getElementById("sortSelect").value;
  const language = document.getElementById("langSelect").value;

  lastQuery = query;
  currentPage = page;

  // Show loading spinner
  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('results').innerHTML = '';

  let q = query ? `${query} in:name,description` : getDefaultQuery();

  if (language) q += ` language:${language}`;

  try {
    const url = `https://api.github.com/search/repositories?q=${q}&sort=${sort}&order=desc&page=${page}&per_page=9`;
    const res = await fetch(url);
    const data = await res.json();

    showRepos(data.items || []);
    updateChart(data.items || []);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    document.getElementById('results').innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger text-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Failed to load repositories. Please try again.
        </div>
      </div>
    `;
  } finally {
    // Hide loading spinner
    document.getElementById('loadingSpinner').style.display = 'none';
  }
}

// Get default query based on current filter
function getDefaultQuery() {
  switch(currentFilter) {
    case "popular":
      return "stars:>500";
    case "trending":
      // Trending repositories created in the last week with high star count
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const formattedDate = oneWeekAgo.toISOString().split('T')[0];
      return `created:>${formattedDate} stars:>100`;
    case "recent":
      // Recently updated repositories
      return "pushed:>2023-01-01";
    default:
      return "stars:>500";
  }
}

// Sanitize user input
function sanitizeQuery(input) {
  return input.trim().replace(/[^a-zA-Z0-9 ]/g, "");
}

function showRepos(repos) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (repos.length === 0) {
    resultsDiv.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <h3>No repositories found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      </div>
    `;
    return;
  }

  repos.forEach(repo => {
    const card = `
      <div class="col-md-4 col-sm-6 col-12">
        <div class="card h-100">
          <div class="card-header">
            <h5 class="mb-0">
              <a class="repo-name text-white" href="${repo.html_url}" target="_blank">
                <i class="fab fa-github me-1"></i>${repo.full_name}
              </a>
            </h5>
          </div>
          <div class="card-body d-flex flex-column">
            <p class="flex-grow-1">${repo.description || "No description available"}</p>
            <div class="mt-auto">
              <div class="mb-3">
                <span class="badge bg-warning text-dark"><i class="fas fa-star me-1"></i> ${repo.stargazers_count}</span>
                <span class="badge bg-success"><i class="fas fa-code-branch me-1"></i> ${repo.forks_count}</span>
                <span class="badge bg-info">${repo.language || "N/A"}</span>
              </div>
              <div class="stats-container">
                <small class="text-muted"><i class="far fa-calendar me-1"></i> Updated: ${new Date(repo.updated_at).toLocaleDateString()}</small>
                <small class="text-muted"><i class="far fa-eye me-1"></i> ${repo.watchers_count}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    resultsDiv.innerHTML += card;
  });
}

function updateChart(repos) {
  const langCount = {};
  repos.forEach(r => {
    if (r.language) {
      langCount[r.language] = (langCount[r.language] || 0) + 1;
    }
  });

  const ctx = document.getElementById("langChart").getContext("2d");
  if (window.repoChart) window.repoChart.destroy();

  window.repoChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(langCount),
      datasets: [{
        data: Object.values(langCount),
        backgroundColor: [
          "#6f42c1", "#20c997", "#ffc107", "#dc3545", 
          "#007bff", "#fd7e14", "#e83e8c", "#6c757d"
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            boxWidth: 15
          }
        }
      }
    }
  });
}

function nextPage() { 
  fetchRepos(currentPage + 1); 
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevPage() { 
  if (currentPage > 1) {
    fetchRepos(currentPage - 1); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Set active filter
function setActiveFilter(filter) {
  currentFilter = filter;
  
  // Update navbar links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-filter') === filter) {
      link.classList.add('active');
    }
  });
  
  // Fetch repositories with new filter
  fetchRepos(1);
}

// Add event listeners for Enter key in search
document.getElementById('searchInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    fetchRepos(1);
  }
});

// Add event listeners for navbar links
document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    setActiveFilter(this.getAttribute('data-filter'));
  });
});

// Load default repos on start
document.addEventListener('DOMContentLoaded', function() {
  fetchRepos();
});