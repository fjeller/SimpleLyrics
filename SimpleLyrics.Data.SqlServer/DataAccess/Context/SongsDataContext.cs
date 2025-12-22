using Microsoft.EntityFrameworkCore;
using SimpleLyrics.Data.SqlServer.DataAccess.Entities;

namespace SimpleLyrics.Data.SqlServer.DataAccess.Context;

/// ==============================================================================================================================
/// <summary>
/// Represents the database context for song data access operations.
/// </summary>
/// ==============================================================================================================================
public partial class SongsDataContext : DbContext
{
	/// ==============================================================================================================================
	/// <summary>
	/// Initializes a new instance of the <see cref="SongsDataContext"/> class.
	/// </summary>
	/// ==============================================================================================================================
	public SongsDataContext()
	{
	}

	/// ==============================================================================================================================
	/// <summary>
	/// Initializes a new instance of the <see cref="SongsDataContext"/> class.
	/// </summary>
	/// <param name="options">The options to be used by the <see cref="DbContext"/>.</param>
	/// ==============================================================================================================================
	public SongsDataContext( DbContextOptions<SongsDataContext> options )
		: base( options )
	{
	}

	/// ==============================================================================================================================
	/// <summary>
	/// Gets or sets the collection of songs in the database.
	/// </summary>
	/// <value>The songs <see cref="DbSet{TEntity}"/>.</value>
	/// ==============================================================================================================================
	public virtual DbSet<Song> Songs { get; set; }

	/// ==============================================================================================================================
	/// <summary>
	/// Configures the schema needed for the songs context.
	/// </summary>
	/// <param name="modelBuilder">
	/// The builder being used to construct the model for this context. Databases may configure additional behavior or
	/// conventions through extension methods.
	/// </param>
	/// ==============================================================================================================================
	protected override void OnModelCreating( ModelBuilder modelBuilder )
	{
		modelBuilder.Entity<Song>( entity =>
		{
			entity.Property( e => e.Category ).HasMaxLength( 50 );
			entity.Property( e => e.Interpreter ).HasMaxLength( 200 );
			entity.Property( e => e.Title ).HasMaxLength( 200 );
		} );

		OnModelCreatingPartial( modelBuilder );
	}

	/// ==============================================================================================================================
	/// <summary>
	/// Provides an extension point for additional model configuration.
	/// </summary>
	/// <param name="modelBuilder">The builder being used to construct the model for this context.</param>
	/// ==============================================================================================================================
	partial void OnModelCreatingPartial( ModelBuilder modelBuilder );
}