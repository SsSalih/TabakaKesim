using Microsoft.EntityFrameworkCore;
using TabakaKesim.Models;

namespace TabakaKesim.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<CalculationRecord> History { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseSqlite("Data Source=history.db");
        }
    }
}
